# 第 7 章 Tailwind

> 題材: `src/components/Section.tsx`、`ui/Button.tsx`、`ui/SmallButton.tsx`、`TabBar.tsx`、`MediaList.tsx`、`src/index.css`
> 目標: このアプリで使っているクラスを見て、位置・大きさ・色を言える。CLAUDE.md の並び順で自分でも書ける。

## 考え方: CSS をクラス名で書く

Tailwind では、CSS を別ファイルに書く代わりに、**1 つの CSS プロパティ = 1 つのクラス** を要素に並べる。

```html
<p class="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"></p>
```

は、ふつうの CSS で書くと:

```css
border-radius: 0.25rem;
border-width: 1px;
border-color: (赤の薄い色);
background-color: (赤のごく薄い色);
padding-left: 0.75rem;
padding-right: 0.75rem;
padding-top: 0.5rem;
padding-bottom: 0.5rem;
font-size: 0.875rem;
color: (赤の濃い色);
```

利点は、要素とその見た目が同じ場所にあること。欠点は、クラスの名前と数の規則を覚えるまで読めないこと。この章はその規則を、このアプリにあるクラスだけで覚える。

## 数の規則: 1 = 0.25rem = 4px

`p-2`、`gap-3`、`mb-12`、`w-12`、`min-h-11` の数字はすべて同じ目盛り。**4 倍すると px** になる。

| クラス     | 値      | px  | このアプリでの使われ方                          |
| ---------- | ------- | --- | ----------------------------------------------- |
| `gap-1`    | 0.25rem | 4   | スライダーと矢印の間                            |
| `p-2`      | 0.5rem  | 8   | 素材の行の内側                                  |
| `gap-3`    | 0.75rem | 12  | サムネイルと文字の間                            |
| `px-4`     | 1rem    | 16  | 画面の左右の余白（`App` の `main`）             |
| `min-h-10` | 2.5rem  | 40  | `Button` の高さ                                 |
| `min-h-11` | 2.75rem | 44  | 指で押す部品の最小の高さ（Apple の指針の 44pt） |
| `w-12`     | 3rem    | 48  | 秒の表示の幅                                    |
| `mb-12`    | 3rem    | 48  | 区切り（`Section`）どうしの間                   |

`min-h-11` がやたら多いのは、スマホで指で押すための約束。`SmallButton` は `min-h-11 min-w-11` で 44px 角を確保している。

分数もある。`w-4/5` は幅 80%。`Button` の normal サイズ。

## 向きの文字

| 文字        | 意味            | 例                                                     |
| ----------- | --------------- | ------------------------------------------------------ |
| `p`         | padding（内側） | `p-2` 全方向、`px-4` 左右、`py-2` 上下、`pt-3` 上だけ  |
| `m`         | margin（外側）  | `mt-2` 上、`mb-4` 下、`mx-auto` 左右を自動（中央寄せ） |
| `-m`        | 負の margin     | `-mx-4` 左右に外へ 16px はみ出す                       |
| `w`         | width           | `w-12`、`w-4/5`、`min-w-0`                             |
| `h`         | height          | `h-6 w-6` アイコンの 24px 角、`min-h-11`               |
| `gap`       | 子どうしの間    | flex や grid の中で                                    |
| `space-y-2` | 子の縦の間      | 子要素の上に margin を付ける（`Section` の中身）       |

`-mx-4` は読み方に注意。`Section` の見出しと `TabBar` が使っている。`main` が `px-4` で左右に 16px の余白を持つので、その分だけ外にはみ出し、画面の幅いっぱいにする。コメントに理由が書いてある。

## 並べる: flex

```tsx
<div className="flex items-center gap-1 text-xs">     // FrameSlider: 横に並べて上下中央
<div className="flex flex-col gap-1">                 // MediaList: 縦に並べる（▲▼削除）
<div className="flex flex-wrap gap-2">                // ChipGroup: 横に並べ、あふれたら折り返す
```

- `flex`: 子を横に並べる。`flex-col` で縦。
- `items-center`: 並べる方向と直角の向きで中央にそろえる（横並びなら上下中央）。
- `gap-N`: 子どうしの間隔。
- `flex-1`: 余った幅を取る。`FrameSlider` の `<input>` が矢印の間を埋める。`TabBar` の各タブが等幅になる。
- `min-w-0`: `flex-1` の子が、中身（長いファイル名）に押されて縮まなくなるのを防ぐ。`MediaList` の `<p className="min-w-0 flex-1 ...">` と `FrameSlider` の `<input className="flex-1 min-w-0">`。セットで覚える。
- `shrink-0`: 縮めない。`Section` のアイコン、当日の流れの時刻の列。

`block w-4/5 mx-auto`（`Button`）は flex ではなく、ブロック要素を幅 80% にして `mx-auto` で中央に置く定型。

## 文字

| クラス         | 意味                                           |
| -------------- | ---------------------------------------------- |
| `text-xs`      | 0.75rem（12px）。小さなボタン、スライダーの行  |
| `text-sm`      | 0.875rem（14px）。本文のほとんど               |
| `text-base`    | 1rem（16px）。キャッチコピー                   |
| `text-lg`      | 1.125rem（18px）。見出しの帯                   |
| `font-bold`    | 太字                                           |
| `text-right`   | 右寄せ（秒の表示）                             |
| `tabular-nums` | 数字を等幅に（秒の表示が動いても幅が揺れない） |
| `break-all`    | 長いファイル名をどこでも折り返す               |

## 色

`色名-濃さ` の形。濃さは 50、100、200 … 900、950。数が大きいほど濃い。

このアプリの色は **2 系統** だけ。

- `stone`: 灰色（やや暖色）。背景 `#f5f5f4` は `stone-100`、本文の文字 `#1c1917` は `stone-900`。
- `blue-700`: 押せるもの（ボタン、リンク）。
- `red`: 注意（上限を超えたとき）。

| クラス                                 | どこ                                      |
| -------------------------------------- | ----------------------------------------- |
| `bg-blue-700 text-white`               | primary のボタン                          |
| `border border-blue-700 text-blue-700` | secondary のボタン、Chip の非選択         |
| `bg-stone-600 text-white`              | 見出しの帯（黒は強すぎるとの感想で 600）  |
| `text-stone-600`                       | 補足の文                                  |
| `border-stone-300`                     | 素材の行の枠。選択中は `border-stone-900` |
| `bg-stone-400`                         | 押せないボタン                            |
| `opacity-50`                           | 上限を超えて入らない素材                  |

`border` は「枠線 1px」、`border-blue-700` はその色。2 つで 1 組。`border-b` は下だけ、`border-t` は上だけ（`MediaList` の編集欄の区切り）。

## 状態と画面幅: `接頭辞:`

```tsx
'bg-blue-700 text-white disabled:bg-stone-400'
'min-h-11 flex-1 rounded-t border px-1 text-xs sm:text-sm'
```

- `disabled:bg-stone-400`: 要素が `disabled` のときだけ背景を灰色に。
- `sm:text-sm`: 画面幅 640px 以上のときだけ `text-sm`（それ未満は `text-xs`）。スマホ優先で、広い画面のときの上書きを後ろに足す。

`hover:` はこのアプリではほぼ使わない。タッチ端末では hover が無いため。

## 並び順の約束（CLAUDE.md）

> レイアウト → サイズ → 余白 → 文字 → 色 → 状態

```tsx
className = 'flex items-center gap-1 text-xs' // レイアウト → 文字
className = 'min-h-11 min-w-11 rounded px-2 text-xs bg-blue-700 text-white disabled:bg-stone-400'
//         サイズ            形      余白 文字    色                    状態
```

読む側が「どこに置くか → どのくらいの大きさか → 周りとの間 → 文字 → 色 → 特別なとき」の順に追えるようにするための順。prettier は並び順を直さないので、自分で守る。

## 条件で変える

```tsx
className={`rounded border p-2 ${selected ? 'border-stone-900' : 'border-stone-300'} ${outside ? 'opacity-50' : ''}`}
```

バッククォートの中に `${}` で三項演算子を入れる。共通のクラスを前に、変わるクラスを後ろに。`Button.tsx` は `look` と `width` を変数に出してから組み立てている。長くなったらこの形。

**やってはいけないこと**: `bg-${color}-700` のようにクラス名を文字列でつなぐ。Tailwind はソースを文字列検索して使われているクラスの CSS だけを作るので、組み立てたクラスは見つからず、スタイルが出ない。候補をすべて書き出す（`active ? 'border-blue-700 bg-blue-700 text-white' : 'border-blue-700 text-blue-700'`）。

## 3 回書いたら部品にする

CLAUDE.md の約束。`bg-blue-700 text-white disabled:bg-stone-400` は `Button` と `SmallButton` の 2 か所にあるが、`ExternalLink.tsx` のコメントのように、3 か所目が出たら切り出す。`@apply` で CSS 側にまとめるのはしない（部品に寄せる）。

## Tailwind v4 の設定

`src/index.css` の 1 行目:

```css
@import 'tailwindcss';
```

と、`vite.config.ts` の `tailwindcss()` プラグイン。これだけ。v3 までにあった `tailwind.config.js` は無い。使っているクラスは Vite がソースから拾う。

## ふつうの CSS を書くとき

`index.css` の残りは、スライダー（`input[type='range']`）の見た目。つまみの大きさや溝の色は擬似要素（`::-webkit-slider-thumb`）で指定するしかなく、Tailwind のクラスでは届かない。こういうときだけ CSS を書く。コメントに「指で操作できるように 44px、つまみ 28px」と理由がある。

## やってみる

開発サーバーを開き、ブラウザの開発者ツール（要素の検査）で、クラスを足したり消したりして見る。保存しなくても試せる。

### 演習 7-1 読んで答える

`TabBar.tsx` の選択中のタブに付く `-mb-px border-b-stone-100` は何をしているか。コメントと見比べて説明する。

### 演習 7-2 色を変える

`Section.tsx` の `bg-stone-600` を `bg-stone-800`、`bg-blue-700` に変えて見比べる。元に戻す。

### 演習 7-3 選択中の枠を青に

`MediaList.tsx` で、「この素材を編集する」を押した行の枠を `border-stone-900` から `border-blue-700` に変える。ボタンの色と同じ系統になるのを確かめる。これは勉強ブランチだけに留めるか、本番に入れたいなら利用者（自分）として判断して ADR ではなく devlog に 1 行書く。

### 演習 7-4 並び順を直す

次のクラス列を CLAUDE.md の順に並べ直す。

```
text-sm bg-red-50 px-3 rounded border-red-300 py-2 text-red-700 border
```

### 演習 7-5 壊してみる

`SmallButton.tsx` で `min-h-11 min-w-11` を消し、スマホ幅（開発者ツールの端末モード、390px）で ▲▼ がどれだけ小さくなるか見る。戻す。

## 答え合わせ

- 7-1: タブの帯の下線（`border-b border-stone-400`）に、選択中のタブの下辺を 1px 重ね（`-mb-px`）、その下辺の色を画面の地色と同じ `stone-100` にする。線が消えて、タブと中身がつながって見える。
- 7-4: `rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700`（形 → 枠 → 色 → 余白 → 文字 → 色。`TotalDuration.tsx` の実物と同じ）。「形」は「サイズ」の仲間として前に置く。

## この章のまとめ

- 数は 4 倍で px。`min-h-11` は 44px、指のための約束。
- `flex` + `gap` + `flex-1 min-w-0` が横並びの定型。
- 色は `stone`（灰）と `blue-700`（押せる）と `red`（注意）だけ。
- `disabled:`、`sm:` は接頭辞。
- クラス名を文字列でつなげない。候補を全部書く。
- 並び順はレイアウト → サイズ → 余白 → 文字 → 色 → 状態。
