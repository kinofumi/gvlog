# 2026-11-11 初期の尺 5 秒固定（ADR 018）の二重レビュー

対象: `main..default-duration-5s`（`defaultDurations` / `equalSplit` → `defaultDuration`、テストの期待値を 150 前提に、plan §2.2・ADR 015・チェックリスト）。

## Codex（P1/P2 なし、P3 が 3 件）

- [P3] `exportVideo.test.ts` 冒頭のコメントが「素材 2 つ」だが、上限 30 では個数の上限も 1 なので 2 枚目は入らない。
- [P3] `videoSources.test.ts` の「出力より後ろの動画」のコメントが旧仕様のまま。`setItemDuration(…, 480)` は 450 に止まる。
- [P3] `plan.md` の M1 行に削除済みの「均等割り、再配分」が残っている。

## Claude `/code-review medium main..HEAD`（5 件）

1. **5 秒より短い動画を足すと、尺 150 が元動画より長いまま入り、末尾が止まった状態（ホールド）が既定になる**。終了位置のスライダーも無効になる。
2. `defaultDuration` の `min(…, maxFrames)` は有効なプリセット（上限 150 以上）では効かず、効く入力では最小尺未満を返しうる。
3. 「上限が 5 秒より短いプリセット」のテストは `validatePreset` が拒否する範囲を固定している。
4. 元動画が 150 未満の動画を `addItems` する経路のテストが無い。
5. plan の M1 行（Codex 3 と同じ）。

## 人間の判断

- Claude 1: **採用**。`defaultDuration(maxFrames, sourceDurationFrames?)` にし、動画は「5 秒と元の長さの短い方」（1 秒未満でも最小尺の 1 秒）。
  ADR 018 の決定と影響に追記。ヘッドレスで 2 秒の動画が 2.0 秒、10 秒の動画が 5.0 秒で入ることを確認。
- Claude 2: 採用。`max(MIN_ITEM_FRAMES, min(DEFAULT_ITEM_FRAMES, 上限))` で `clampDuration` と同じ規則に揃えた。
- Claude 3 / 4: 採用。上限 60 のテストを捨て、動画（90、300、10 フレーム）のテストを `durations.test.ts` と `projectActions.test.ts` に足した。
- Codex 1〜3 / Claude 5: 採用。コメントと plan の M1 行（「当時の均等割り・再配分は ADR 015 で廃止」）を直した。

テスト 224 件、lint・typecheck 通過。
