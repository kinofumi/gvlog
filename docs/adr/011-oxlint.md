# 011 リンターは ESLint ではなく oxlint を使う

日付: 2026-10-08

## 状況
プランでは ESLint を予定していたが、Vite 8 の react-ts テンプレートは oxlint（Rust 製の高速リンター）と
`.oxlintrc.json` を生成するようになっていた。

## 選択肢
1. テンプレートの oxlint を外して ESLint を入れ直す
2. テンプレートどおり oxlint を使う

## 決定
2 を採用。`npm run lint` は `oxlint`。設定は `.oxlintrc.json`（React の hooks ルールと TypeScript）。

## 理由
テンプレートの既定に合わせるほうが読者が再現しやすく、設定ファイルも短い。
ESLint 固有のプラグインが必要になったら、そのときに ADR を書いて切り替える。
