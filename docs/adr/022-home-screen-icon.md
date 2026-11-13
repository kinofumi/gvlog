# 022 ホーム画面のアイコンは manifest と apple-touch-icon で付け、開き方はブラウザのままにする

→ 「開き方はブラウザのまま」は 023 で置き換え（standalone に変更）。アイコンの付け方はこのまま。

日付: 2026-11-14

## 状況

栞で「事前にホーム画面に追加しておくと当日ふつうのアプリのように起動できる」と案内しているが、追加したときのアイコンが
ページのスクリーンショット（iPhone）や既定の文字（Android）になっていた。利用者から「アイコンを設定したい」との要望。
画像は利用者が用意（`docs/icon-source.png`、組織のマークとビデオカメラ、白地、1024 角）。

## 選択肢

1. `apple-touch-icon`（iPhone）と Web App Manifest（Android）でアイコンと名前だけ付ける。開き方は今までどおりブラウザ（`display: browser`）
2. 1 に加えて `display: standalone` にして、アドレスバーの無いアプリ風の全画面で開く
3. PWA（Service Worker でオフライン対応、インストール）まで進める（plan §8 の M6）

## 決定

1 を採る（利用者の判断）。

- `index.html` に `apple-touch-icon`（180 角）、`manifest`、`apple-mobile-web-app-title`、`theme-color` を足す。
- `public/manifest.webmanifest`: 名前 gvlog、`start_url` と `scope` は `/gvlog/`、アイコンは 192 / 512 と、Android の丸いマスク用に余白を広げた 512（`purpose: maskable`）。
  パスは Pages のサブパスを含めて絶対で書く（manifest は Vite が書き換えないため）。
- アイコンの PNG は `sips` で `docs/icon-source.png` から作る（1024 角に切ってから縮小。maskable は 70% に縮めて白で 512 角に埋める）。
- ブラウザのタブの favicon（青いカメラの SVG）はそのまま。

## 理由

- 2 の standalone は見た目はアプリらしいが、iPhone では共有シートやファイル保存、`<input type="file">` の挙動が Safari と変わることがある。
  実機で確認済みの動作（書き出し・共有・保存）はすべてブラウザで取ったもので、イベントまで 2 週間で再確認する余裕が無い。
- 3 はオフライン対応が要らない（会場に Wi-Fi があり、動画の生成はローカルで完結する）ので M6 のまま。

## 影響

- 追加後のアイコンと名前は実機でしか確認できない（チェックリストに追加）。
- 「ホーム画面に追加」の案内（栞の prep）は変えない。
