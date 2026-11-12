# 2026-11-12 「つなげる」の簡易プレビュー（ADR 017 追記）の二重レビュー

対象: `main..join-preview`（`join/previewSteps.ts`、`components/JoinPreview.tsx`、`components/JoinClipList.tsx`（JoinPanel から切り出し）、ADR 017 の追記）。

## Codex（P1 が 1 件、P2 が 3 件）

- [P1] `active` / `exporting` で手順を隠すだけで再生の状態が残るので、タブに戻る・書き出しが終わると途中から勝手に再開し、BGM は止まったまま。
- [P2] `play().catch(next)` と `onerror = next` が同じ失敗で両方動くと 2 手順進む。片付けのあとの Promise も無効にならない。
- [P2] 再生中に曲を選び直しても `<audio>` は始めたときの曲のまま。
- [P2] 手順が 10 分の上限を見ておらず、動画も `durationFrames` でなく末尾まで再生するので、出力と長さがずれる。
- （参考）アンマウント時の音の停止がない。muted / playsInline / 操作の中の `audio.play()` は WebKit の方針どおり。

## Claude `/code-review medium main..HEAD`（8 件）

1. 再開の問題（Codex P1 と同じ）。
2. `play()` の失敗を `next` で握りつぶすので、iPhone の低電力モード（muted でも操作の外の `play()` が NotAllowedError）では全クリップが一瞬で飛ばされ、白い終わりだけ出る。二重の `next` も（Codex と同じ）。
3. 曲の選び直しが反映されない（Codex と同じ）。
4. `JoinClipList` が合計を `sourceDurationFrames` から再計算していて、1 秒未満の切り上げが入らず `overflowSec` と食い違う。
5. 上限の無視（Codex と同じ）。
6. 黒い 1×1 の `BLANK` が `usePreview.ts` と重複。
7. `JoinPanel` のコメントに「プレビューは無し」と「簡易版」が同居。
8. 動画の手順中も見えない canvas を描き直している。

## 人間の判断

- Codex P1 / Claude 1、Codex P2 曲 / Claude 3: 採用。「再生していてよい条件の目印」（`session` = useMemo で、手順・曲・表示・書き出しのどれかが変わると別のオブジェクト）を
  再生の状態に持ち、今の目印と違えば止まっているとみなす。effect の中で setState しない形（lint の `set-state-in-effect` も避けられる）。
- Codex P2 二重 / Claude 2: 採用。`next` は 1 手順につき 1 回（`done` フラグ。片付けでも立てる）。`NotAllowedError` は飛ばさずに止めて赤い文で知らせる。
  再生ボタンの操作の中で `<video>` の `play()` を一度呼び、WebKit の「操作の外からの再生」制限を外す。
- Codex P2 上限 / Claude 5: 採用。`previewSteps(items, maxFrames)` が出力と同じく切り詰める（テスト追加）。各手順の長さは `durationFrames`
  （動画は `playing` から数える。短い動画は最後のフレームで待ち、上限で切った動画は途中で次へ）。
- Claude 4: 採用。合計は JoinPanel がプロジェクトの尺から計算して渡す。`JoinClipList` は JOIN_* を知らない。
- Claude 6: 採用。`preview/blankImage.ts` に 1 つにして両方から import。
- Claude 7 / 8: 採用。
- Codex 参考（アンマウント時）: 採用（音を止める effect を 1 つ）。
- `JoinPreview.tsx` 203 行 / `JoinPanel.tsx` 207 行は、コメントを含めての値なので今回はこのまま（次に手を入れるとき分割を検討）。

## 検証

- `npm run lint` / `typecheck` / `vitest run`（245 件）通過。
- ヘッドレス Chrome: 2 秒 + 10 秒の動画と BGM で、表紙（3 秒）→ 1 本目 → 2 本目 → 白い終わり → 停止、BGM はループ。
  再生中にタブを離れて戻っても止まったまま。再生中に曲を「なし」にすると止まる。BGM なしでも同じ順に進む。
  表紙の止め絵は最初フレーム 0 で描いていてテロップが薄かった（フェードインの途中）ので、素材の真ん中のフレームにした。
- 低電力モードの経路は実機で確認する（チェックリストに追加）。
