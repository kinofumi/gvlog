# M0 縦割り検証のレビュー（2026-10-08）

対象: ブランチ `m0-vertical-slice`、`main` との差分（実装 `468b4ec`、修正後のコミットは末尾に記載）。
範囲: Vite 雛形、`timeline/`、`render/`、`media/`、`export/`、`App.tsx`、デプロイ設定、検証スクリプト。

## 自己チェック
- `npm run typecheck`、`npm run lint`、`npm test`（13 件）すべて通過。
- ヘッドレス Chrome で写真 + H.264 動画の書き出しを確認（`docs/support-matrix.md`）。

## Claude の指摘（`/code-review main high`、9 件）
1. **Critical** `PhotoFrameSource.dispose()` が呼び出し側の所有する ImageBitmap を閉じるため、2 回目の書き出しが失敗する。
2. **Warning** 書き出し中もファイル選択が有効で、差し替えると使用中の Input / ビットマップを閉じてしまう。
3. **Warning** oxlint がプラン §10 と ADR に無い（CLAUDE.md の「外部ライブラリは表にあるものだけ」に反する）。
4. **Warning** `VideoFrameSource` の current / next のポンプは、mediabunny の `canvasesAtTimestamps()` で置き換えられる（約 60 行 → 約 20 行）。
5. **Warning** `importVideo` のエラー経路で `Input` を解放していない。
6. **Warning** `importImage` で縮小に失敗するとフルサイズのビットマップが閉じられない。
7. **Warning** `onPickPhoto` / `onPickVideo` が await の前に前の資源を閉じるため、読み込みが重なると違う資源を閉じる。
8. **Info** favicon の href に base が直書きされている。
9. **Info** `new Blob([buffer])` が出力をコピーし、一時的にメモリが 2 倍になる。

## 人間の判断
- 採用: 1〜8。
  - 1: `PhotoFrameSource.dispose()` を何もしない実装にし、「呼び出し側から受け取った資源は解放しない」を interface の規約に書いた。
  - 2: 取り込み中と書き出し中はファイル入力を `disabled` にした。
  - 3: ADR 011 を追加し、プラン §10 を oxlint に直した。
  - 4: `canvasesAtTimestamps()` に区間の時刻列を渡す形に書き直した。「時刻以下で最新のフレーム」と末尾ホールドはライブラリに任せる。
  - 5: `probe()` に分け、失敗時に `input.dispose()` してから投げ直す。
  - 6: `try / finally` で必ず `full.close()`。
  - 7: 前の資源は functional setState の中で閉じる。
  - 8: `href="/favicon.svg"` にして Vite に base を付けさせる（ビルド結果で確認）。
- 不採用: 9。10 秒 / 約 10MB では影響が小さく、`StreamTarget` への変更は Worker 化と同じ「後の章」で扱う。
- 修正後の確認: 13 件のテスト通過、ヘッドレス Chrome で 2 回連続の書き出しが成功（1.6 秒 / 1.5 秒）、出力の 5.0 秒と 6.0 秒のフレームが異なる（動画が進んでいる）。

## Codex の指摘（`/codex review`）
（この下に追記）

## 学び（教科書向けメモ）
- 「誰が資源を閉じるか」を interface の規約として書いておかないと、便利な `dispose()` が持ち主の資源まで閉じてしまう。
- 自前のイテレータ制御は、ライブラリが同じことをやっていないか先に探す（CLAUDE.md の reuse ladder）。
