# 第 8 章 状態とデータの流れ

> 題材: `src/state/store.ts`、`src/state/projectActions.ts` とそのテスト、`src/components/MediaList.tsx`
> 目標: スライダーを動かしたときに、どのファイルのどの関数を通って画面が変わるかを追える。

## 全体像

```
[部品]  FrameSlider の onChange
  ↓ setItemDuration(itemId, frames)
[store] useAppStore の setItemDuration
  ↓ actions.setItemDuration(project, itemId, frames)
[純粋関数] projectActions.ts → timeline/durations.ts、clamp.ts、trim.ts
  ↓ 新しい project
[store] set({ project })
  ↓ 変わった部分を見ている部品だけが再描画
[部品]  MediaList、TotalDuration、PreviewCanvas …
```

考え方は Python でも書ける。「状態は 1 つの dict。変更は `new = f(old, ...)` を返す純粋関数。dict を差し替えたら、購読している関数を呼び直す」。zustand はその「購読」の部分を React 用に用意したライブラリ。

## store の形

```ts
export const useAppStore = create<AppState>((set, get) => ({
  project: actions.createProject(DEFAULT_PRESET),
  images: {},
  videos: {},
  ui: { selectedItemId: null, playheadFrame: 0, isPlaying: false, importing: false, exporting: false },

  setItemDuration: (itemId, frames) => { ... },
  select: (itemId) => set((s) => ({ ui: { ...s.ui, selectedItemId: itemId } })),
  ...
}))
```

- `AppState` の型（ファイル冒頭）に、**データ** と **操作（action）** の両方が並んでいる。Python のクラスで言えば属性とメソッドだが、クラスは使わない。
- `create` に渡した関数が初期状態を返す。`set` は状態を差し替える関数、`get` は今の状態を読む関数。
- action の中で `set({ project })` や `set((s) => ({ ui: { ...s.ui, selectedItemId } }))` と呼ぶ。渡したフィールドだけが差し替わる（浅い merge）。`ui` の中の 1 つを変えるときは、4 章のスプレッドで `ui` を作り直す。

## action は純粋関数に任せる

`store.ts` の冒頭コメント:

> プロジェクトの変更は projectActions の純粋関数に任せ、ここでは画像の所有と UI 状態だけを扱う。

`projectActions.ts` の関数は `(project, ...) => project` の形で、store も React も知らない。だから `projectActions.test.ts` は vitest だけで動き、ブラウザが要らない。テストを読むと「追加した素材は 5 秒」「上限を超えたら追加しない」「同じ値なら元のまま（`toBe(p)`）」といった仕様がそのまま書いてある。

store 側に残っているのは、

- 画像や動画の **所有**（`ImageBitmap` を閉じる、使い終わった動画を解放する）。これは副作用なので純粋関数に入れない。
- `ui`（選択中、再生中、取り込み中、書き出し中）。

## 部品からの読み方: セレクタ

```tsx
const items = useAppStore((s) => s.project.items)
const exporting = useAppStore((s) => s.ui.exporting)
const setItemDuration = useAppStore((s) => s.setItemDuration)
```

`useAppStore(セレクタ)` は「状態のこの部分」を返し、**その部分が変わったときだけ** 部品を描き直す。`useAppStore()` と引数なしで全体を取ると、何が変わっても描き直されて遅くなるので、必ず必要な部分だけ取る。action も同じ書き方で取る。

## 追ってみる: 尺のスライダー

1. `MediaList.tsx`: `<FrameSlider ... onChange={(frames) => setItemDuration(item.itemId, frames)} />`
2. `FrameSlider.tsx`: スライダーを動かすと `onChange(Number(e.target.value))`。矢印なら `onChange(stepFrames(...))`。
3. `store.ts`: `setItemDuration: (itemId, frames) => set((s) => withProject(s, actions.setItemDuration(s.project, itemId, frames)))`。`withProject` はファイルの下にある補助関数で、新しい `project` が元と同じオブジェクトならそのまま返し、違えば再生位置（`ui.playheadFrame`）も新しい尺の範囲に収めて返す。
4. `projectActions.ts` の `setItemDuration`: `clampDuration` で整え、同じ値なら元の `project` を返す。違えば `items` を `map` で作り直し、`clampAfterResize`（つなぎとテロップを尺に収める）、`clampTrims`（動画の開始位置を収める）を通す。
5. `set` で差し替わる。`s.project.items` を見ている `MediaList`、`TotalDuration`、`PreviewCanvas` が描き直される。`s.ui.exporting` だけを見ている部品は、その値が変わらない限り動かない。

テスト `projectActions.test.ts` の「変えたあとはトランジションとキャプションが切り詰められる」が、4 の仕様をそのまま書いている。

## 「同じなら元を返す」の意味

```ts
expect(setItemDuration(p, 'p1', 150)).toBe(p)
expect(removeItem(p, 'nope')).toBe(p)
```

変化が無いときは **同じオブジェクト** を返す。store はそれを見て `set` を呼ばず、部品は描き直されない。4 章の「壊さずに変える」の裏返しで、「変えないときは新しく作らない」。Python で `if new == old: return old` と書くのと同じだが、ここでは `==` ではなく同一性で判定するので速い。

## 排他: `importing` と `exporting`

```tsx
const exporting = useAppStore((s) => s.ui.exporting)
<SmallButton label="削除" disabled={exporting} ... />
```

書き出し中に素材を消すと、使っている画像が閉じられて書き出しが壊れる。store に「今は書き出し中」を 1 つ置き、関係する部品がそれを見て自分を無効にする。フラグを 1 か所に置き、部品は読むだけ。

## やってみる

### 演習 8-1 追う

▲ ボタン（並べ替え）を押したときの経路を、1〜5 の形で書く。`moveItem` を `MediaList.tsx` → `store.ts` → `projectActions.ts` と読む。「範囲外なら元のまま」がどこで判定されているか。

### 演習 8-2 どこで立つか

`ui.exporting` を `true` にしている場所と `false` に戻している場所を `grep` で探す。戻し忘れたら何が起きるか考える。

```sh
grep -rn "setExporting" src
```

### 演習 8-3 テストから仕様を言う

`projectActions.test.ts` の `describe('addPhoto / addItems ...')` を読み、素材の追加の規則を 4 つ、日本語の箇条書きにする。

### 演習 8-4 1 つ足す（勉強ブランチだけ）

`ui` に `showHelp: boolean` を足し、`toggleHelp()` という action を足す。`MediaList` の案内文（「この素材を編集する」を押すと…）を、`showHelp` が真のときだけ出すようにする。手順:

1. `AppState` の型に 2 つ足す（型エラーで、初期値と実装を書く場所を教えてくれる）。
2. 初期値 `showHelp: true` と、`toggleHelp: () => set((s) => ({ ui: { ...s.ui, showHelp: !s.ui.showHelp } }))`。
3. `store.test.ts` に「`toggleHelp` で反転する」のテスト。
4. `MediaList` で読んで条件描画。

## 答え合わせ

- 8-1: `MediaList` の `onClick={() => moveItem(item.itemId, index - 1)}` → store の `moveItem` → `actions.moveItem(project, itemId, toIndex)`。範囲外・無い ID・同じ位置は `actions.moveItem` の冒頭で `return project`（テスト「範囲外の位置や無い ID、同じ位置への移動なら元のまま」）。
- 8-2: `src/components/ExportPanel.tsx` の 1 か所だけ。書き出しの開始で `true`、`finally` で `false`。戻し忘れると削除・並べ替え・尺の変更がずっと押せなくなる。
- 8-3: 新しい素材の尺は 5 秒で、既存の尺は変えない／写真は Ken Burns が none、テロップ無し、cut でつなぐ／個数の上限（15 秒なら 15 個）を超えたら追加しない／同じ ID は拒否し、まとめて追加でも飛ばす。
- 8-4: テストは `useAppStore.getState().toggleHelp(); expect(useAppStore.getState().ui.showHelp).toBe(false)` の形（`store.test.ts` の既存のテストに書き方の例がある）。

## この章のまとめ

- 状態は 1 つの store。部品はセレクタで必要な部分だけ読む。
- 変更は `projectActions.ts` の純粋関数が新しい `project` を返し、store が `set` で差し替える。
- 変化が無いときは同じオブジェクトを返す。描き直しが起きない。
- 排他のフラグは store に 1 つ置き、部品は読んで自分を無効にする。
