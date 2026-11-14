# 第 6 章 React の部品を読む

> 題材: `src/components/ui/SmallButton.tsx`、`Section.tsx`、`FrameSlider.tsx`、`TabBar.tsx`、`TotalDuration.tsx`、`App.tsx`
> 目標: 「関数が画面を返す」「props は引数」「状態が変わると関数がもう一度呼ばれる」の 3 点で部品を読める。
> この章では `className="..."` の中身は **読み飛ばす**。7 章で見る。

## 部品 = 画面の一部を返す関数

```tsx
export function SmallButton({ label, variant = 'primary', title, disabled, onClick }: Props) {
  const look = variant === 'primary' ? '...' : '...'
  return (
    <button type="button" className={`...`} aria-label={title} title={title} disabled={disabled} onClick={...}>
      {label}
    </button>
  )
}
```

- 関数の名前は大文字で始める（`SmallButton`）。小文字は HTML の要素（`button`）。
- 戻り値の `<button>...</button>` は **JSX**。HTML に似た見た目で、実際には「要素を作る関数呼び出し」に変換される。拡張子が `.tsx` なのはそのため。
- JSX の中で `{ }` を書くと TypeScript の式に戻る。`{label}` は変数の値、`onClick={...}` は関数を渡している。

Python に無理に対応づけるなら、Jinja のテンプレートを「引数を受けて HTML を返す関数」として書いたもの。

## props は引数、型を付ける

```tsx
type Props = {
  label: string
  variant?: 'primary' | 'secondary'
  title?: string
  disabled?: boolean
  onClick: () => void
}
```

使う側は `<SmallButton label="▲" onClick={() => moveItem(...)} />` と、HTML の属性のように渡す。関数側は `{ label, variant = 'primary', ... }: Props` と分割代入で受け、既定値を `=` で書く。Python の `def small_button(*, label, variant='primary', ...)` と同じ。

`onClick: () => void` は「引数なし、戻り値なしの関数」。部品はボタンが押されたことだけ伝え、何をするかは呼ぶ側が決める。

## `children`: 中身を受け取る

```tsx
type Props = { title: ReactNode; icon?: IconName; children: ReactNode }

export function Section({ title, icon, children }: Props) {
  return (
    <section className="mb-12">
      <h2 ...>{icon && <Icon name={icon} .../>}<span>{title}</span></h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
```

```tsx
<Section title="素材" icon="film">
  <MediaList />
</Section>
```

開きタグと閉じタグの間に書いたものが `children` として渡る。`ReactNode` は「JSX として置けるもの何でも」（文字列、要素、配列、`null`）。

## 条件で出す・出さない

```tsx
{
  icon && <Icon name={icon} />
}
{
  selected && <div>...</div>
}
{
  cutNote && <span className="text-red-700"> {cutNote}</span>
}
```

`A && B` は A が偽なら A（`undefined` や `''`）、真なら B。JSX は `undefined`、`null`、`false`、`''` を **何も描かない** ので、「A のときだけ B を出す」になる。Python の `B if A else None` に当たる。

3 択以上なら `? :` を重ねる（`MediaList.tsx` の `cutNote`）。

`App.tsx` のタブは別の方法で、要素を消さずに隠している。

```tsx
<div className={tab === 'editor' ? '' : 'hidden'}>
```

理由はコメントにある。「取り込んだ画像や `<video>` を作り直さないため」。条件で消すと中身の状態も消える。

## 一覧は `map` で描く

```tsx
{tabs.map((tab) => {
  const active = tab.id === value
  return (
    <button key={tab.id} ... onClick={() => onChange(tab.id)}>
      {tab.label}
    </button>
  )
})}
```

配列を JSX の配列に変換して置く。`key` は各要素を見分けるための印で、**一覧には必ず付ける**（無いと警告が出て、並べ替えで表示が崩れることがある）。ID のように変わらない値を使う。添字は並べ替えで変わるので避ける。

## イベント

```tsx
onClick={(e) => {
  e.stopPropagation()
  onClick()
}}
onChange={(e) => onChange(Number(e.target.value))}
```

`onClick`、`onChange` に関数を渡す。`e` はイベント。`e.target.value` は入力欄の値で **文字列** なので、`Number()` で数に直している（スライダーの値も文字列で来る）。

`e.stopPropagation()` は「親の要素にクリックを伝えない」。`SmallButton` は一覧の行の中にあるので、親の行がクリックを受け取らないようにしている。

## 状態: `useState`

```tsx
const [tab, setTab] = useState<Tab>('guide')
const [splash, setSplash] = useState(true)
```

`useState(初期値)` は `[今の値, 変える関数]` の組を返す。`setTab('editor')` を呼ぶと、**この関数（App）がもう一度呼ばれて**、新しい `tab` で JSX が作り直される。これが React の全部と言ってよい。

- 値を直接書き換えても（`tab = 'editor'`）画面は変わらない。必ず `set` 関数を使う。
- `<Tab>` は型の指定。`'guide'` から推論すると `string` になってしまうので、`Tab` だと明示している。

## store から読む: `useAppStore`

```tsx
const items = useAppStore((s) => s.project.items)
const preset = useAppStore((s) => s.project.preset)
```

`TotalDuration.tsx` はアプリ全体の状態（store）から値を取り出している。`(s) => s.project.items` は「状態のうちこの部分だけ見る」という関数（セレクタ）。その部分が変わったときだけ、この部品が描き直される。詳しくは 8 章。

`TotalDuration` は、取り出した値を 3 章の純粋関数（`sumFrames`、`overflowFrames`）に渡して、結果を文で出すだけ。計算は部品の外にある。これがこのアプリの基本形。

## props を素通しする: `...rest`

```tsx
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ...; size?: ... }

export function Button({ variant = 'primary', size = 'normal', className = '', ...rest }: Props) {
  return <button className={`... ${className}`} {...rest} />
}
```

`Button.tsx` は、自分で使う 3 つだけ取り出し、残り（`onClick`、`disabled`、`aria-expanded` など）を `...rest` でまとめて `<button>` に渡す。Python の `**kwargs` を下に流すのと同じ。`ButtonHTMLAttributes<HTMLButtonElement>` は「`<button>` が受け付ける全属性」の型で、React が用意している。

## `TabBar<T extends string>`

```tsx
export function TabBar<T extends string>({ tabs, value, onChange }: Props<T>)
```

タブの ID は `App` では `'guide' | 'tips' | 'editor' | 'join'`。`T` のおかげで `onChange` に渡る ID もその型になり、`switchTab(next: Tab)` が受け取れる。4 章と同じ「入れた型のまま返す」ための最小限のジェネリクス。

## やってみる

### 演習 6-1 読んで答える

`FrameSlider.tsx` で、◀ ボタンが押せなくなる条件を 2 つ挙げる。

### 演習 6-2 1 行足す

`TotalDuration.tsx` で、上限内のときの文に素材の数を足す。「合計 12.0 秒（3 個、上限 15.0 秒）。…」のように。`items.length` を使う。開発サーバーで写真を 3 枚入れて確かめる。

### 演習 6-3 条件描画

6-2 で、素材が 1 個のときは「（1 個、」ではなく個数を出さないようにする。`? :` で書く。

### 演習 6-4 key を外す

`TabBar.tsx` の `key={tab.id}` を消して開発サーバーを開き、ブラウザの開発者ツールのコンソールに何が出るか読む。戻す。

## 答え合わせ

- 6-1: `disabled`（親が無効にしている。書き出し中）または `value <= min`（もう下限）。
- 6-2: `const count = items.length` を足し、`合計 {sec(total)} 秒（{count} 個、上限 {sec(preset.maxFrames)} 秒）。` のように `{count}` を文に入れる。
- 6-3: `{count > 1 ? `${count} 個、` : ''}` のように、文字列を返す三項演算子を `{ }` に入れる。
- 6-4: `Each child in a list should have a unique "key" prop.` の警告が出る。

## この章のまとめ

- 部品は props を受けて JSX を返す関数。大文字で始める。
- `{cond && <X />}` で条件描画、`xs.map(...)` と `key` で一覧。
- 値は `useState` の set 関数か store の action で変える。変わると関数がもう一度呼ばれる。
- 計算は部品の外（`src/timeline/` など）に置き、部品は値を文や要素にするだけ。
