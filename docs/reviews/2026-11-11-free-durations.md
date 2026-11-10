# 2026-11-11 各コマの尺を独立にし、合計は上限 15 秒で切る（ADR 015）の二重レビュー

対象: `main..free-durations`（`timeline/durations.ts` の書き換え、`preset.totalFrames` → `maxFrames`、`projectActions` の追加・削除・尺変更、
store の `seek`、`exportVideo` の長さ、`TotalDuration` と一覧の印、`PreviewCanvas` / `usePreview` の出力長、plan §0 / §2 / §2.2）。
きっかけはフィールドテストの「編集中のコマより前のコマを変えないでほしい。全体は 15 秒。超えたら注意、無視したら 15 秒で切る」。

## Codex（P2 が 2 件、P3 が 2 件）
- [P2] 尺を縮めたり素材を外したりしても再生位置を補正しないので、出力の範囲外に取り残される（黒画面、スライダーの値が max 超え）。
- [P2] 「入りません」「x 秒で切れます」の判定が `coreStart` / `coreEnd` で、クロスフェードで早く見え始める分（`visibleStart`）を無視している。
- [P3] 1 フレームの超過が「末尾 0.0 秒」と表示される。
- [P3] 「合計が上限未満ならその長さ」を書き出しループで確かめるテストがない。

## Claude `/code-review main..free-durations high`（10 件）
1. 再生位置の取り残し（Codex 1 と同じ）。
2. 判定が `visibleStart` を見ていない（Codex 2 と同じ）。
3. `createVideoSources` が上限より後ろの動画にもデコーダ（CanvasSink）を作る。スマホのメモリの無駄。
4. 実機チェックリストが旧仕様（「合計が 10 秒のまま」）のままで、新しい挙動の項目がない。
5. `splitProportionally`（重み付き最大剰余方式、30 行 + テスト 6 本）が、`equalSplit` が重み 1 で呼ぶだけになって残っている。
6. `TotalDuration` が描画中に `useAppStore.getState()` を読んでいる（購読と別経路）。
7. `defaultDurations` が残り全部を均等に割るため、1 枚ずつ追加すると最初のコマが 15 秒を独占し、2 枚目から赤い注意になる。コメントも旧仕様のまま。
8. 「合計が上限を超えたら maxFrames で止める」を直接確かめる書き出しテストがない。
9. `MIN_TOTAL_FRAMES` / `MAX_TOTAL_FRAMES` の名前が「合計の尺」のままで、検証対象は上限に変わっている。plan の `MAX_ITEMS（10 秒なら 10）` も旧値。
10. 無関係な `docs/manual/QRpng` の削除が同じコミットに混ざっている。

## 人間の判断
- Codex 1 / Claude 1: 採用。store に `clampPlayhead` を置き、`setItemDuration`・`setTrimEnd`・`removeItem` の後に再生位置を出力の範囲へ収める。回帰テストを追加。
- Codex 2 / Claude 2: 採用。一覧の印は `visibleStart` / `visibleEnd` で判定する。
- Codex 3: 採用。超過分は 0.1 秒単位に切り上げて表示する（1 フレームなら「0.1 秒」）。
- Codex 4 / Claude 8: 採用。「上限未満ならその長さ」「上限超えなら上限で止める」の 2 本を `exportVideo.test.ts` に追加。
- Claude 3: 採用。`createVideoSources` に出力の長さを渡し、そこから先の動画は作らず、またぐ動画は区間を切る。テストを追加。
- Claude 4: 採用。チェックリストの M2 項目を ADR 015 の 4 項目に置き換え、M3 の「10 秒」を「最長 15 秒」に。
- Claude 5: 採用。`equalSplit` を「floor を配り、余りを先頭から 1 ずつ」の 3 行で書き直し、`splitProportionally` とそのテストを削除。
- Claude 6: 採用。合計が上限以下のときの出力は合計そのものなので、`sumFrames` の値をそのまま表示する。
- Claude 7: **仕様どおり（利用者の決定）**。「追加直後の初期の尺は上限までの残りを均等に割る」は利用者に確認済み。
  1 枚ずつ追加する使い方では 1 枚目が 15 秒になり、2 枚目以降は 1 秒 + 赤い注意になる点は利用者に伝える。コメントは直した。
- Claude 9: 採用。`MIN_LIMIT_FRAMES` / `MAX_LIMIT_FRAMES` に改名し、plan の表を `maxItems(maxFrames)（15 秒なら 15）` に。
- Claude 10: 採用。`QRpng` は main の状態に戻した（前回の作業で main に入ってしまっていた。扱いは利用者に確認する）。

## 検証
- `npm run lint` / `typecheck` / `vitest run`（220 件）通過。
- ヘッドレス Chrome: 写真 2 枚 + 10 秒の動画を追加（5/5/5 秒）→ 1 枚目を 2 秒にしても他は 5 秒のまま → 3 つ目を 15 秒にすると
  「合計 22.0 秒。…末尾 7.0 秒は、生成する動画に入りません」と「（8.0 秒で切れます）」→ 生成した MP4 は 450 フレーム（ffprobe）、
  14.9 秒の画素は動画の 8 秒目の色（灰）。再生位置 400 で 2 枚目を 3 秒に縮めると位置は 13.0 / 13.0 秒に収まる。
