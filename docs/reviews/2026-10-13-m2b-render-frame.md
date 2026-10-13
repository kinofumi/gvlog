# 2026-10-13 M2(B) renderFrame の合成の二重レビュー

対象: `main..m2-render-frame`（`renderFrame.ts`、`drawCaption.ts`、`drawCover.ts`、`@napi-rs/canvas` のテスト 10 件）。

## Codex（2 件、ゲート PASS）
- [P2] 黒塗りが呼び出し前の描画状態に依存する（`globalAlpha` を黒塗りの後に設定。`globalCompositeOperation` も未設定）。Node の Canvas で再現して確認。
- [P2] 変化しないキャプションを毎フレーム再計測する（書記素ごとの `measureText`、配置の再生成）。

## Claude `/code-review main..HEAD high`（9 件）
1. `ImageProvider.get` が返す画像の寸法が `item.width/height` と一致する前提が書かれていない。M3 で `VideoFrameSource`（出力サイズに cover 済み）を接続すると二重クロップになる。
2. box の横幅が `textWidth + padding × 2` で画面幅を超えうる（9:16 の L サイズ）。
3. 改行や空白だけのテキストで、文字の無い帯やボックスだけが描かれる。
4. `drawCaption` の `save()` に `try/finally` がなく、例外時に `renderFrame` の `restore()` がずれる。
5. outline の縁取りに半透明の既定色が使われ、明るい背景で読みにくい。
6. `type Ctx` が 3 か所に重複。
7. `layout.lines.length === 0` は到達不能、`globalAlpha = 1` のリセットも冗長。
8. 毎フレームの折り返し・配置の再計算と、`findItem` の 2 回の線形探索（Codex 2 と同じ）。
9. plan §3.2 の署名と §1 のファイル一覧が実装と違う。

## 人間の判断
- Codex 1 / Claude 4, 6, 7: 採用。`renderFrame` と `drawCaption` を `save()` + `try/finally` + `restore()` で囲み、黒塗りの前に不透明度と合成モードを明示。
  同じ Canvas を再利用して事前状態を変えたテストを追加。`Ctx` は `render/ctx.ts` に 1 つ。到達不能な分岐と冗長なリセットを削除。
- Claude 1: 採用。`ImageProvider.get` は `{ image, width, height }` を返す契約にし、切り出し矩形はその寸法から計算する。`RenderItem` から `width/height` を外した。
  出力サイズと同じ画像なら二重クロップされないテストを追加。plan §3.2 に契約を明記。
- Claude 2: 採用。box の左右の余白は `min(padding, (W − textWidth) / 2)`。
- Claude 3: 採用。`text.trim() === ''` なら描かない。
- Claude 5: 採用。背景色の既定をプリセットごとに持ち、outline は不透明の黒。
- Claude 8 / Codex 2（毎フレームの再計算）: **今回は採用しない**。30 文字程度のテロップなら `measureText` 30 回は 1 フレームの予算に対して小さい。
  キャッシュは「いつ無効化するか」の複雑さを足す。M2(C) のプレビューで実機の負荷を測り、重ければ素材ごとに 1 回だけ計算する形にする。
  `findItem` の 2 回探索だけは、見えている素材を 1 回だけ引く形に直した。
- Claude 9: 採用。plan §1 と §3.2 を更新。

## 2 者の比較
- 両方が指摘: 描画状態の漏れ、毎フレームの再計測。
- Claude だけ: 画像寸法の契約（M3 の接続先まで読んで見つけた）、box の幅、空白のみ、例外時の save/restore、縁取りの既定色、重複、ドキュメント。
- Codex は Node の Canvas で実際に再現して指摘した。

## 修正後の確認
- lint / typecheck / 134 件のテスト通過。

## 学び（教科書向けメモ）
- Canvas に描く関数は、入口で状態を明示し、出口で戻す（`save` / `try` / `finally` / `restore`）。呼び出し側の状態を信用しない。
- 「画像の寸法はどこから来るか」のような暗黙の契約は、別のモジュール（M3 の動画）を接続したときに壊れる。型で持たせる。
- 最適化の指摘は、計測してから採用を決める。採用しない理由も記録に残す。
