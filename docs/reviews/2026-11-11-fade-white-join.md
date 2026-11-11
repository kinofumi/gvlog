# 2026-11-11 白フェード（ADR 016）と「つなげる」タブ（ADR 017）の二重レビュー

対象: `c650c64..main`（おすすめタブ、`fadeWhite` の型・描画・チップ、`join/joinProject.ts`、`JoinPanel`、`ExportPanel` の props 化、
`media/importEntries.ts`、`ui/SmallButton.tsx`）。

## Codex（P1 が 1 件、P2 が 5 件、P3 が 1 件）
- [P1] タブ間の書き出しが排他されていない。`ExportPanel` の `canExport` がローカルの `phase` だけを見て、store の `ui.exporting` を見ていない。
- [P2] つなげるの取り込み中（ローカル state）に「つなげて生成」が押せ、古い一覧で書き出される。
- [P2] 10 分を超えた分が警告なしで切り捨てられる。
- [P2] `JoinPanel` のアンマウント時に集めた動画を解放しない。
- [P2] 既定 15 フレームでは進行度が 0.5 を通らず、真っ白なフレームがない（最大 14/15）。
- [P2] 1 秒未満の動画の尺が 1 秒になり「元の長さ」でなくなる。
- [P3] `buildJoinProject` は ID と日時を作るので純粋関数ではない。

## Claude `/code-review c650c64..main high`（7 件）
1. 排他の抜け（Codex 1 と同じ）。
2. **fadeWhite の描画規則と trim の時刻規則の不一致**: 後の素材は前半で描かれないが、`sourceFrameAt` は `visibleStart` を開始位置に対応させるので、
   つなげるモードでは各クリップの先頭 floor(d/2) フレームが一度も表示されない。前の素材の末尾にも余分なデコードが要る。
3. 取り込み中の印が store に届かない（Codex 2 と同じ）。
4. `App` が project 全体を購読するようになり、尺スライダーのドラッグで全タブが再描画される。
5. fadeWhite の後半でも前の素材を描いてから上書きしていて、1 フレームにつき 1 回の描画が無駄。
6. `importOneVideo` の戻り値が `NewEntry` のままで、`JoinPanel` に到達不能な分岐（`'video' in entry`）がある。
7. 合計表示が 10 分超過を知らせない（Codex 3 と同じ）。

## 人間の判断
- Claude 2: **採用（設計の修正）**。fadeWhite では見える区間を広げない（`compileTimeline` で `crossfade` のときだけ `leadIn` / `tailOut` を足す）。
  前半は前の素材、後半は後の素材がコア区間どおりに見えるので、動画の先頭は飛ばず、余分なデコードもなく、描画の「2 つ目を飛ばす」分岐と
  Claude 5 の無駄な描画も消えた。compile のテストと ADR 016 / plan §2.3 を更新。
- Codex 1 / Claude 1: 採用。`canExport` は store の `ui.exporting` で判定する。ヘッドレスで「つなげるで生成中は編集タブの『動画を生成』が無効」を確認。
- Codex 2 / Claude 3: 採用。`JoinPanel` の取り込み中は store の `setImporting` を使う（タブをまたいで取り込みも 1 つずつ）。
- Codex 3 / Claude 7: 採用。合計が 10 分を超えたら編集タブと同じ赤い注意を出す。
- Codex 5: 採用。既定を 16 フレーム（偶数）にし、境界のフレームが真っ白になるテストを追加。
- Claude 4: 採用。`EditorExport` に配線を切り出し、`App` の購読を preset と meta に戻した。
- Claude 6: 採用。`importOnePhoto` / `importOneVideo` の戻り値を `NewPhoto` / `NewVideo` にして分岐を消した。
- Codex 4: 不採用。`JoinPanel` は App が隠すだけで外さない。その旨をコメントと ADR に書いた。
- Codex 6: 不採用。編集で作る動画は 1 秒以上なので起きない。1 秒未満は 1 秒にして最後のフレームで止めると ADR に明記。
- Codex 7: 文言だけ修正（「純粋関数」→「ID と日時以外は入力だけで決まる」）。

## 検証
- `npm run lint` / `typecheck` / `vitest run`（228 件）通過。
- ヘッドレス Chrome: 10 秒 + 2 秒の動画をつなげて 360 フレーム。境界のフレーム 300 は (255,255,255)、292 は前の色のまま、308 は後の色。
  つなげるで生成中、編集タブの「動画を生成」は無効。
