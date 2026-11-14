# 第 4 章 配列とオブジェクトを壊さずに変える

> 題材: `src/timeline/clamp.ts`、`src/timeline/compile.ts` とそのテスト
> 目標: 「入力を変えず、新しい値を返す」書き方を読める・書ける。`map`、`filter`、スプレッドが使える。

## なぜ壊さないか

このアプリの状態（プロジェクト）は、変更のたびに **新しいオブジェクト** に置き換えられる（8 章）。React は「前と同じオブジェクトか」で再描画するかを決めるので、中身だけ書き換えると画面が更新されない。だから `src/timeline/` と `src/state/projectActions.ts` の関数は、どれも入力を変えずに新しい値を返す。

`clamp.test.ts` にそれを確かめるテストがある。

```ts
it('元の配列と要素は変更しない', () => {
  const items = [ ... ]
  clampAfterResize(items)
  expect(items[0].transitionOut?.durationFrames).toBe(30)
})
```

Python で言えば「リストを `sorted()` で返すか、`.sort()` で書き換えるか」の違いを、常に `sorted()` 側に寄せる。

## スプレッド `...`: コピーして一部を変える

```ts
const next = { ...item }
next.transitionOut = { ...item.transitionOut, durationFrames: 0 }
```

`{ ...item }` は `item` の全フィールドを持つ新しいオブジェクト。Python の `{**item}` や `dataclasses.replace(item, ...)`。後ろに書いたフィールドが上書きする。

```ts
{ ...item.caption, ...clampCaptionOffsets(item.caption, item.durationFrames) }
```

2 つを重ねると、後ろの関数が返した `inOffsetFrames` と `outOffsetFrames` だけが差し替わり、`text` や `position` は残る。

コピーは **1 段だけ**（浅いコピー）。`{ ...item }` をしても `item.transitionOut` は同じオブジェクトを指す。だから `next.transitionOut = { ...item.transitionOut, ... }` と、変える段ごとにコピーしている。

配列にも使える。`[...items, newItem]` は末尾に足した新しい配列（`items + [new_item]`）。

## `map` と `filter`: リスト内包の代わり

```ts
return items.map((item, i) => {
  const next = { ...item }
  ...
  return next
})
```

`items.map(fn)` は `[fn(x) for x in items]`。添字が要るときは第 2 引数で受ける。

```ts
export function itemsAt(compiled: CompiledItem[], frame: number): CompiledItem[] {
  return compiled.filter((c) => frame >= c.visibleStart && frame < c.visibleEnd)
}
```

`filter(fn)` は `[x for x in xs if fn(x)]`。

| Python                                | TypeScript                                     |
| ------------------------------------- | ---------------------------------------------- |
| `[f(x) for x in xs]`                  | `xs.map((x) => f(x))`                          |
| `[x for x in xs if p(x)]`             | `xs.filter((x) => p(x))`                       |
| `[f(x) for x in xs if p(x)]`          | `xs.filter((x) => p(x)).map((x) => f(x))`      |
| `any(p(x) for x in xs)`               | `xs.some((x) => p(x))`                         |
| `all(p(x) for x in xs)`               | `xs.every((x) => p(x))`                        |
| `next((x for x in xs if p(x)), None)` | `xs.find((x) => p(x))`（無ければ `undefined`） |
| `xs.index(v)`                         | `xs.indexOf(v)`（無ければ `-1`）               |
| `xs[1:3]`                             | `xs.slice(1, 3)`                               |
| `len(xs)`                             | `xs.length`                                    |
| `for x in xs:`                        | `for (const x of xs) {`                        |

## `for` 文を使うとき

`compileTimeline` は `map` ではなく `for` で書いてある。

```ts
let cursor = 0
let leadIn = 0
for (let i = 0; i < items.length; i++) {
  const item = items[i]
  const following = items[i + 1]
  ...
  cursor = coreEnd
  leadIn = ...
}
```

前の要素の結果（`cursor`、`leadIn`）を次に持ち越すので、各要素が独立な `map` では書きにくい。こういうときは素直に `for` と `let` を使う。「賢く書かない」が CLAUDE.md の方針。

`items[i + 1]` は末尾で `undefined` になる（Python なら `IndexError`）。`if (item.transitionOut && ... && following)` と、`following` が無いことを条件に入れている。

## `?.`: 無いかもしれないものを安全に読む

```ts
const overlaps = transitionOut?.type === 'crossfade'
```

`transitionOut` が `null` なら `transitionOut?.type` は `undefined` になり、エラーにならない。Python には無い書き方（`getattr(x, 'type', None)` に近い）。

## `Set`

```ts
const seen = new Set<string>()
if (seen.has(item.itemId)) errors.push(...)
seen.add(item.itemId)
```

Python の `set()`。`in` は `.has()`、`add` は `.add()`。`<string>` は要素の型。

## ジェネリクスは「最小限」

```ts
export function clampAfterResize<T extends TimelineItem>(items: T[]): T[] {
```

`T` は「`TimelineItem` の形を持つ何かの型」。Python の `TypeVar('T', bound=TimelineItem)`。

なぜ要るか。引数を `TimelineItem[]` と書くと、戻り値も `TimelineItem[]` になり、`MediaItem` が持っていた `fileName` や `kind` の型情報が消える。`T` を使うと「入れた型のまま返す」と言える。コメントにもその理由が書いてある。

CLAUDE.md は「ジェネリクスの多用を避ける」としている。このように **理由がコメントにある 1 か所** に限る。6 章の `TabBar<T extends string>` も同じ考え。

## テストで小さいオブジェクトを渡す

```ts
const items = [
  {
    itemId: 'a',
    durationFrames: 40,
    transitionOut: { type: 'crossfade' as const, durationFrames: 30 },
  },
  { itemId: 'b', durationFrames: 260 },
]
```

`'crossfade' as const` は、`type` の型を `string` ではなく `'crossfade'` に固定するため。無いと `Transition['type']` に合わずエラーになる。2 章の `as const` と同じ。

## やってみる

### 演習 4-1 読んで予想する

150 フレームの素材 a に 30 フレームの crossfade、次に 150 フレームの b。`compileTimeline` の結果の `compiled[0]` と `compiled[1].visibleStart` を紙に書く。`compile.test.ts` に `toEqual` のテストとして足して確かめる。

### 演習 4-2 `itemsAt`

4-1 の `compiled` で、`itemsAt(compiled, 140)` と `itemsAt(compiled, 100)` が返す `itemId` の並びを予想し、テストに足す。

### 演習 4-3 TDD で 1 つ足す

「タイムライン全体の長さ（最後に見えているフレームの次）」を返す `timelineEnd(compiled)` を `compile.ts` に足す。`reduce` と `Math.max` で書く。4-1 の例では 300。空なら 0。

### 演習 4-4 壊してみる

`clampAfterResize` の `const next = { ...item }` を `const next = item` に変えて `npm test`。「元の配列と要素は変更しない」のテストが落ちることを確かめ、戻す。

## 答え合わせ

- 4-1: `compiled[0]` は `{ itemId: 'a', coreStart: 0, coreEnd: 150, visibleStart: 0, visibleEnd: 165, transitionOut: { type: 'crossfade', start: 135, end: 165 } }`。30 を前に `floor(30/2) = 15`、後ろに `ceil(30/2) = 15` 割る。crossfade なので a は 165 まで見え、b は 135 から見え始める。`compiled[1].visibleStart` は `135`。
- 4-2: `['a', 'b']` と `['a']`。
- 4-3:
  ```ts
  /** タイムライン全体の長さ（最後に見えているフレームの次）。空なら 0 */
  export function timelineEnd(compiled: CompiledItem[]): number {
    return compiled.reduce((end, c) => Math.max(end, c.visibleEnd), 0)
  }
  ```

## この章のまとめ

- 変えずに新しい値を返す。`{ ...x, field: v }`、`[...xs, y]`、`map`、`filter`。
- コピーは浅い。変える段ごとに `...` する。
- 持ち越しがあるループは `for` と `let` で素直に書く。
- ジェネリクスは「入れた型のまま返す」ための 1 か所に限る。
