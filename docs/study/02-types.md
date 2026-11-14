# 第 2 章 型を読む

> 題材: `src/model/types.ts`、`src/model/validate.ts`
> 目標: `types.ts` の型を Python の `dataclass` と `Literal` に置き換えて説明できる。`validatePreset` がなぜ `unknown` を受けるか言える。

## 型エイリアスは dataclass に近い

```ts
export type GroupPreset = {
  id: string
  name: string
  aspect: '16:9' | '9:16'
  width: number
  height: number
  fps: 30
  maxFrames: number
}
```

Python で書くなら:

```python
@dataclass
class GroupPreset:
    id: str
    name: str
    aspect: Literal['16:9', '9:16']
    width: float
    height: float
    fps: Literal[30]
    max_frames: float
```

違いが 3 つある。

1. **クラスではない。** `type` は「この形のオブジェクト」という名前を付けるだけで、コンストラクタもメソッドも無い。作るときは `{ id: 'default', name: 'Vlog', ... }` と書く（`src/model/defaults.ts`）。
2. **`number` は float。** `width: number` に `1080.5` も入る。整数であることは型では言えないので、`Number.isInteger` で実行時に確かめる（`validate.ts`）。
3. **フィールド名は camelCase。** `maxFrames`。Python の snake_case とは違う。

## リテラル型と union

```ts
aspect: '16:9' | '9:16'
fps: 30
```

`|` は「どちらか」。Python の `Literal['16:9', '9:16']` と同じ。`fps: 30` は「30 という値しか入らない」型。v1 では fps を固定している（ADR 009）ので、型で縛っている。

```ts
export type Transition = {
  type: 'cut' | 'crossfade' | 'fadeWhite'
  durationFrames: number
}
```

Python なら `Enum` を作るところだが、TypeScript では文字列リテラルの union で済ませることが多い。値がそのまま文字列なので、JSON に保存しても読み戻しても変わらない。

## `?` は「無くてもよい」

```ts
export type TimelineItem = {
  itemId: string
  durationFrames: number
  transitionOut?: Transition
  caption?: CaptionTiming
}
```

`transitionOut?` は「無いかもしれない」。無いときの値は `undefined`。Python の `Optional[Transition] = None` に近いが、2 点違う。

- 無いときは `None` ではなく `undefined`。
- フィールド自体が **存在しなくてもよい**。`{ itemId: 'a', durationFrames: 150 }` はこの型を満たす。

使う側は `if (item.transitionOut)` で確かめてから触る。`item.transitionOut.type` と無確認で書くと型エラーになる（`'item.transitionOut' is possibly 'undefined'`）。

## `&` で型を合体する

```ts
export type Caption = CaptionTiming & {
  text: string
  presetId: 'band' | 'outline' | 'box'
  ...
}
```

`&` は「両方のフィールドを持つ」。Python の継承（`class Caption(CaptionTiming)`）に近いが、親子関係は無く、単にフィールドが足し合わさる。

## `kind` で見分ける union（このアプリで一番大事な型）

```ts
export type PhotoItem = ItemBase & { kind: 'photo'; kenBurns: KenBurns }
export type VideoItem = ItemBase & {
  kind: 'video'
  sourceDurationFrames: number
  trimStartFrames: number
}
export type MediaItem = PhotoItem | VideoItem
```

`MediaItem` は写真か動画のどちらか。どちらかは `kind` を見れば分かる。TypeScript は `if` で `kind` を調べると、その中では型を絞り込む。

```ts
// src/timeline/trim.ts
if (item.kind !== 'video') return item
// ここから下では item は VideoItem。trimStartFrames に触れる
const trimStartFrames = clampTrimStart(
  item.trimStartFrames,
  item.sourceDurationFrames,
  visibleLength,
)
```

Python 3.10 の `match item: case VideoItem(): ...` に相当する。`isinstance` の代わりにフィールドの値で見分ける、と覚える。

## 構造的な型: 「形が合えば通る」

`types.ts` のコメントにこうある。

> MediaItem はこの型（TimelineItem）を含むので、そのまま渡せる。

`compileTimeline(items: TimelineItem[])` に `MediaItem[]` を渡せるのは、`MediaItem` が `TimelineItem` の全フィールドを持っているから。継承の宣言は要らない。Python の `Protocol`（静的なダックタイピング）と同じ考え方。

この性質を使って、`src/timeline/` の関数は **必要な最小限のフィールドだけを持つ型** を受ける。テストでは `{ itemId: 'a', durationFrames: 40 }` のような小さいオブジェクトを渡せばよく、写真の寸法やファイル名を書く必要がない（`clamp.test.ts` を見る）。

## `unknown` と `as`: 外から来た値

```ts
export function validatePreset(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, errors: ['プリセットの形式が不正です。'] }
  }
  const p = value as Record<string, unknown>
```

- `unknown` は「何が来るか分からない」。Python の `Any` と違い、**確かめるまで何もできない**。`value.id` と書くと型エラー。
- `typeof value !== 'object'` で絞り込んでから、`as Record<string, unknown>` で「文字列キーの辞書として扱う」と宣言する。`Record<K, V>` は Python の `dict[K, V]`。
- 各フィールドを `typeof p.id !== 'string'` のように 1 つずつ確かめ、最後にそろった値で `GroupPreset` を組み立てる。

`as` は「私が責任を持つのでこの型として扱って」という宣言で、実行時には何もしない。確かめた直後にだけ使う。確かめずに `as` で黙らせるのは、Python で `# type: ignore` を貼るのと同じ。

戻り値の型も union になっている。

```ts
export type ValidationResult = { ok: true; preset: GroupPreset } | { ok: false; errors: string[] }
```

`ok` が `true` なら `preset` がある、`false` なら `errors` がある。呼ぶ側は `if (result.ok)` で分岐すれば、それぞれの中で正しいフィールドだけが見える。例外を投げずに結果を型で返す書き方で、Python の `Result` 型を自作するのに似ている。

## `as const`

```ts
const SIZE_BY_ASPECT = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
} as const
```

`as const` を付けると、`width` の型が `number` ではなく `1920` という値そのものになり、キーも `'16:9' | '9:16'` に固定される。これで `SIZE_BY_ASPECT[aspect]` が「aspect はこの 2 つのどちらか」と確かめたあとだけ通る。

## `import type`

```ts
import type { GroupPreset } from './types'
```

型だけを読み込むときは `import type`。型は実行時に消えるので、このファイルからの依存も消える。値（関数や定数）を読み込むときは普通の `import`。

## やってみる

### 演習 2-1 Python に書き直す

`types.ts` の `KenBurns` と `Caption` を Python の dataclass で書く。`overrides?: { textColor?: string; ... }` をどう表すか考える（入れ子の dataclass か、`TypedDict(total=False)` か）。

### 演習 2-2 絞り込みを壊す

`src/timeline/trim.ts` の `clampTrims` で、`if (item.kind !== 'video') return item` の行をコメントアウトして `npm run typecheck`。何行目で何と言われるか読む。元に戻す。

### 演習 2-3 検証を 1 つ足す

`validatePreset` は `name` が空かどうかしか見ていない。「`name` が 20 文字を超えたらエラー」を足す。先に `src/model/validate.test.ts` にテストを書く。

```ts
it('プリセット名が 20 文字を超えたらエラー', () => {
  const result = validatePreset({ ...DEFAULT_PRESET, name: 'あ'.repeat(21) })
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.errors).toContain('プリセット名は 20 文字までです。')
})
```

`DEFAULT_PRESET` はこのテストファイルの冒頭ですでに import されている。赤くなるのを見てから、`validate.ts` に 1 行足して緑にする。

## 答え合わせ

- 2-2: `error TS2339: Property 'trimStartFrames' does not exist on type 'MediaItem'.` が 2 か所と、`sourceDurationFrames` について同じエラーが 1 か所、合わせて 3 つ出る。`MediaItem` のまま（絞り込まずに）動画だけのフィールドに触ったため。
- 2-3: `validate.ts` の名前の検査の次に `else if (p.name.length > 20) errors.push('プリセット名は 20 文字までです。')` を足す。`typeof p.name !== 'string'` の確認が先にあるので、`else if` の中では `p.name` は `string` として扱える。テストの `if (!result.ok)` は、`errors` が `ok: false` のときにしか無いための絞り込み。

## この章のまとめ

- `type` は形の名前。クラスではない。
- 「どちらか」は `|`、「両方」は `&`、「無くてもよい」は `?`。
- `kind` のようなフィールドで union を見分けると、型が絞り込まれる。
- 外から来た値は `unknown` で受け、確かめてから使う。`as` は確かめた直後にだけ。
