# 002 動画処理ライブラリに mediabunny を採用する

日付: 2026-10-08

## 状況
Canvas で描いたフレームを MP4 にまとめる処理と、入力動画からフレームを取り出す処理が必要。iPhone と Android の両対応。

## 選択肢
1. ffmpeg.wasm
2. webm-muxer / mp4-muxer ＋ WebCodecs を直接扱う
3. mediabunny（WebCodecs の上に mux / demux / デコード / エンコードをまとめた TypeScript ライブラリ）

## 決定
3 を採用。

## 理由
ffmpeg.wasm はスマホに重く、GitHub Pages では COOP/COEP を設定できず SharedArrayBuffer が使えない。
mp4-muxer は mediabunny の前身で、作者が mediabunny を後継としている。
mediabunny は依存ゼロ、MPL-2.0、Safari 16.4+ 対応、コーデック判定と回転処理を備える。

## 確認（2026-10-08、M0）
Headless Chrome と iPhone（iOS 18.7）の両方で、写真と動画から 1080x1920 / 30fps / 10 秒の無音 MP4 を書き出せた。
iPhone では共有シートから写真アプリへの保存まで確認。この時点で採用を確定する。
注意点として、`canEncodeVideo` の判定と実際のエンコード成否は一致しないことがある（iOS で Level 3.1 の判定が可なのに失敗）。
アプリ側で実エンコードによる確認を行う。Android は未確認。
