# 第 3 章 関数とテスト

> 題材: `src/timeline/durations.ts` とそのテスト、`src/components/frameStep.ts` とそのテスト
> 目標: 関数とテストを 1 組、自分で先にテストを書いてから足せる。

## 関数の書き方

```ts
export function maxItems(maxFrames: number): number {
  return Math.floor(maxFrames / MIN_ITEM_FRAMES)
}
```

Python との対応:

| Python                  | TypeScript                                             |
| ----------------------- | ------------------------------------------------------ |
| `def f(x: int) -> int:` | `function f(x: number): number {`                      |
| `lambda x: x + 1`       | `(x) => x + 1`                                         |
| `def f(x, y=10):`       | `function f(x: number, y = 10)`                        |
| `x // 2`                | `Math.floor(x / 2)`                                    |
| `x ** 2`                | `x ** 2`                                               |
| `x if cond else y`      | `cond ? x : y`                                         |
| `f"{a} と {b}"`         | `` `${a} と ${b}` ``（バッククォート）                 |
| `a or default`          | `a ?? default`（`a` が `null`/`undefined` のときだけ） |
| `from m import f`       | `import { f } from './m'`                              |
| 先頭に `_` で非公開     | `export` を付けないと非公開                            |

`export` を付けた関数だけが、他のファイルから `import` できる。`durations.ts` の全部に `export` が付いているのは、他のファイルやテストから使うため。`clamp.ts` の `toFrames` には付いていないので、そのファイルの中だけで使う関数。

## `??` と `||` は違う

```ts
const limit = Math.min(maxFrames, sourceDurationFrames ?? maxFrames)
```

`??` は左が `null` か `undefined` のときだけ右を使う。Python の `or` に近い `||` もあるが、`||` は `0` や `''` でも右を使ってしまう。フレーム数のように `0` が意味を持つ値には `??` を使う。

## 変数

```ts
const errors: string[] = []
let cursor = 0
```

- `const`: 再代入しない。**ほぼこれだけ使う。** ただし中身（配列の要素、オブジェクトのフィールド）は変えられる。`errors.push(...)` は通る。
- `let`: 再代入する。ループのカウンタや累積に使う。
- `var`: 使わない（古い書き方）。

型は多くの場合書かなくてよい。`let cursor = 0` で `number` と推論される。`const errors: string[] = []` に型を書いているのは、空の配列からは要素の型が分からないため。

## `number` の罠

Python 中級者が最初にはまる場所。

- `7 / 2` は `3.5`。整数除算が無い。
- `Number.isInteger(150.5)` は `false`。整数かどうかは実行時に確かめる。
- `Number.NaN`（非数）、`Number.POSITIVE_INFINITY` も `number`。`Number.isFinite(x)` で両方をはじける。
- `Math.max(0, Math.min(x, limit))` は「0 以上 limit 以下に収める」の定型。このアプリの至るところにある。

`clampDuration` を読む。

```ts
export function clampDuration(frames: number, maxFrames: number): number | null {
  if (!Number.isFinite(frames)) return null
  return Math.max(MIN_ITEM_FRAMES, Math.min(Math.floor(frames), maxFrames))
}
```

戻り値の `number | null` は「数か、意味のある空」。数でない入力（空の入力欄）は `null` で返し、呼ぶ側に「無視して」と伝える。例外を投げない。

## 配列の操作

```ts
export function sumFrames(durations: number[]): number {
  return durations.reduce((sum, d) => sum + d, 0)
}
```

Python の `sum(durations)` に当たる組み込みは無いので、`reduce` で書く。`reduce(fn, 初期値)` は `functools.reduce` と同じ。

```ts
durations.forEach((d, i) => {
  if (!Number.isInteger(d)) errors.push(`素材 ${i + 1} の尺（${d}）が整数ではありません。`)
})
```

`forEach((要素, 添字) => ...)` は `for i, d in enumerate(durations):`。要素が先、添字が後。

## テストを読む

```ts
import { describe, expect, it } from 'vitest'
import { maxItems } from './durations'

describe('maxItems（素材数の上限）', () => {
  it('15 秒（450 フレーム）なら最小尺 1 秒で 15 個まで', () => {
    expect(maxItems(450)).toBe(15)
  })
})
```

| pytest                          | vitest                             |
| ------------------------------- | ---------------------------------- |
| `class TestMaxItems:`           | `describe('...', () => { ... })`   |
| `def test_...(self):`           | `it('...', () => { ... })`         |
| `assert f(x) == 15`             | `expect(f(x)).toBe(15)`            |
| `assert a == b`（辞書・リスト） | `expect(a).toEqual(b)`             |
| `assert a is b`                 | `expect(a).toBe(b)`                |
| `assert x in xs`                | `expect(xs).toContain(x)`          |
| `assert x is None`              | `expect(x).toBeNull()`             |
| `with pytest.raises(E):`        | `expect(() => f()).toThrow('...')` |

`toBe` と `toEqual` の違いは大事。`toBe` は同一性（Python の `is`）、`toEqual` は中身の比較（`==`）。配列やオブジェクトは `toEqual`。「変えていないので同じオブジェクトが返る」を確かめたいときだけ `toBe`（`projectActions.test.ts` の `expect(removeItem(p, 'nope')).toBe(p)`）。

テスト名が日本語の文なのは CLAUDE.md の約束。読めば仕様が分かる名前にする。

## TDD の手順（このリポジトリの約束）

1. テストファイルに `it('...')` を書く。期待値を先に決める。
2. `npm run test:watch` で赤くなるのを見る（関数が無いので、import のエラーで落ちる）。
3. 関数を書く。緑になる。
4. 境界の値（0、最小、最大、NaN）のテストを足す。赤くなったら直す。

「先に赤を見る」のが肝。緑しか見ていないテストは、何も確かめていないことがある。

## やってみる

### 演習 3-1 読んで予想する

`frameStep.ts` の `stepFrames(152, 1, 3, 30, 450)` の戻り値を、コードを読んで予想する。`frameStep.test.ts` で確かめる。

### 演習 3-2 0.5 秒刻み

`framesPerStep(30, 0.5)` はいくつか。`stepFrames(152, 1, 15, 30, 450)` と `stepFrames(152, -1, 15, 30, 450)` はいくつか。予想してから `frameStep.test.ts` に 3 行足して確かめる。

### 演習 3-3 TDD で 1 つ足す

「上限まであと何フレーム入るか」を返す `remainingFrames(durations, maxFrames)` を `durations.ts` に足す。超えているときは 0。

先にテスト（`durations.test.ts` の末尾）:

```ts
describe('remainingFrames（上限まであと何フレーム入るか）', () => {
  it('合計が上限以下なら差分、超えていれば 0、空なら上限そのまま', () => {
    expect(remainingFrames([150, 150], 450)).toBe(150)
    expect(remainingFrames([300, 300], 450)).toBe(0)
    expect(remainingFrames([], 450)).toBe(450)
  })
})
```

import の行にも `remainingFrames` を足す。赤を見てから実装する。

### 演習 3-4 lint と型チェック

3-3 のあと `npm run lint` と `npm run typecheck` を通す。JSDoc コメント（`/** ... */`）を関数の上に 1 行書く。

## 答え合わせ

- 3-1: `153`。152 は 3 の格子に乗っていないので、`Math.floor(152 / 3) * 3 = 150` に戻してから `+ 3`。
- 3-2: `15`、`165`、`150`。
- 3-3:
  ```ts
  /** 上限まであと何フレーム入るか。超えているときは 0 */
  export function remainingFrames(durations: number[], maxFrames: number): number {
    return Math.max(0, maxFrames - sumFrames(durations))
  }
  ```
  `overflowFrames` と対になる形。`sumFrames` を使い回す。

## この章のまとめ

- `function f(x: number): number`、`const`、`=>`、バッククォートの 4 つで大半のコードが読める。
- `number` は float。整数は `Math.floor` と `Number.isInteger` で自分で守る。
- `toBe` は `is`、`toEqual` は `==`。
- 赤を見てから書く。
