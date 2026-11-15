#!/bin/sh
# 勉強テキスト（docs/study/*.md）から HTML 版（docs/study/html/）を作る。
#
# Markdown が元データで、HTML は生成物。本文を直すときは .md を直してこのスクリプトを実行し直す。
# 生成するもの:
#   docs/study/html/index.html            … README（プラン）
#   docs/study/html/01-tools.html など    … 各章（章ごとの目次つき）
#   docs/study/html/python-to-typescript.html
#   docs/study/html/all.html              … 全部を 1 つにまとめたもの（配る・印刷する用）
# どのファイルも CSS を埋め込んだ 1 ファイルで完結する（画像や外部の読み込みは無い）。
#
# やること:
#   1. ```tsx は pandoc の色分けが知らないので ```typescript に置き換えて渡す（表示のためだけ。元の .md は変えない）
#   2. pandoc で GitHub 風 Markdown（表、コードフェンス）を HTML に。見た目は scripts/study-style.css
#   3. 章どうしのリンク（*.md）を *.html に書き換え、README は index.html にする
#   4. 各ページの上に「プラン・前の章・次の章」の行き先を足す
#
# 使い方: scripts/make-study-html.sh   （pandoc が要る。brew install pandoc）
set -eu
cd "$(dirname "$0")/.."

SRC=docs/study
OUT=docs/study/html
CSS=scripts/study-style.css
mkdir -p "$OUT"

# 章の並び（README は index になる）
CHAPTERS="01-tools 02-types 03-functions-and-tests 04-immutable 05-async 06-react 07-tailwind 08-state 09-next python-to-typescript"

# 1 行目の「# 見出し」をページのタイトルにする
title_of() {
  sed -n '1s/^# //p' "$1"
}

# Markdown を 1 ページの HTML にする。$1 = 元の .md、$2 = 出力の .html、$3 = 上に置くリンクの HTML、$4 = --toc を付けるか（yes/no）
render() {
  md=$1
  html=$2
  nav=$3
  toc=$4
  tmp=$(mktemp)
  # 行き先の行のあとに <main> を開き、本文のあとで閉じる（CSS で幅をそろえるため）
  printf '%s\n<main>\n' "$nav" > "$tmp.nav"
  printf '</main>\n' > "$tmp.end"
  toc_flag=""
  if [ "$toc" = yes ]; then toc_flag="--toc --toc-depth=2"; fi
  sed 's/^```tsx$/```typescript/' "$md" |
    pandoc -f gfm -t html5 --standalone --embed-resources \
      --css "$CSS" \
      --metadata lang=ja \
      --metadata pagetitle="$(title_of "$md")" \
      --include-before-body "$tmp.nav" \
      --include-after-body "$tmp.end" \
      $toc_flag \
      -o "$html"
  # 章どうしのリンクを HTML 版に向ける
  sed -i '' -e 's|href="README\.md"|href="index.html"|g' -e 's|href="\([0-9a-z-]*\)\.md"|href="\1.html"|g' "$html"
  rm -f "$tmp" "$tmp.nav" "$tmp.end"
}

# README → index.html
render "$SRC/README.md" "$OUT/index.html" '<p class="study-nav"><a href="all.html">1 ファイル版（印刷用）</a></p>' no

# 各章
prev=""
set -- $CHAPTERS
i=0
for name in "$@"; do
  i=$((i + 1))
  next=""
  if [ $i -lt $# ]; then
    next=$(printf '%s\n' "$@" | sed -n "$((i + 1))p")
  fi
  nav='<p class="study-nav"><a href="index.html">プラン</a>'
  if [ -n "$prev" ]; then nav="$nav<a href=\"$prev.html\">← $(title_of "$SRC/$prev.md")</a>"; fi
  if [ -n "$next" ]; then nav="$nav<a href=\"$next.html\">$(title_of "$SRC/$next.md") →</a>"; fi
  nav="$nav</p>"
  render "$SRC/$name.md" "$OUT/$name.html" "$nav" yes
  prev=$name
done

# 全部を 1 ファイルに。各ファイルの見出しはすべて「#」なので、章の区切りが目次（深さ 1）になる
all=$(mktemp)
printf '<main>\n' > "$all.nav"
printf '</main>\n' > "$all.end"
for name in README $CHAPTERS; do
  sed 's/^```tsx$/```typescript/' "$SRC/$name.md" >> "$all"
  printf '\n\n' >> "$all"
done
pandoc -f gfm -t html5 --standalone --embed-resources \
  --css "$CSS" \
  --metadata lang=ja \
  --metadata pagetitle="gvlog で学ぶ TypeScript と Tailwind（全章）" \
  --include-before-body "$all.nav" \
  --include-after-body "$all.end" \
  --toc --toc-depth=1 \
  -o "$OUT/all.html" "$all"
# 1 ファイル版では章のリンクはページ内の見出しに向ける（pandoc が見出しに付ける id は見出しの文字そのもの）
sed -i '' \
  -e 's|href="README\.md"|href="#gvlog-で学ぶ-typescript-と-tailwind--勉強プラン"|g' \
  -e 's|href="01-tools\.md"|href="#第-1-章-道具をそろえる"|g' \
  -e 's|href="02-types\.md"|href="#第-2-章-型を読む"|g' \
  -e 's|href="03-functions-and-tests\.md"|href="#第-3-章-関数とテスト"|g' \
  -e 's|href="04-immutable\.md"|href="#第-4-章-配列とオブジェクトを壊さずに変える"|g' \
  -e 's|href="05-async\.md"|href="#第-5-章-非同期"|g' \
  -e 's|href="06-react\.md"|href="#第-6-章-react-の部品を読む"|g' \
  -e 's|href="07-tailwind\.md"|href="#第-7-章-tailwind"|g' \
  -e 's|href="08-state\.md"|href="#第-8-章-状態とデータの流れ"|g' \
  -e 's|href="09-next\.md"|href="#第-9-章-仕上げと次の一歩"|g' \
  -e 's|href="python-to-typescript\.md"|href="#付録-python-と-typescript-の対照表"|g' \
  "$OUT/all.html"
rm -f "$all" "$all.nav" "$all.end"

ls -la "$OUT"
