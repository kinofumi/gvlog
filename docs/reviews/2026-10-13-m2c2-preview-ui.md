# 2026-10-13 M2(C2) プレビュー再生と編集 UI の二重レビュー

対象: `main..m2-preview-ui`（`preview/clock.ts`、`preview/usePreview.ts`、`components/PreviewCanvas / PhotoPicker / Thumbnail / MediaList / ItemEditor`、新しい `App.tsx`）。
UI なので自動テストは `frameAtElapsed` の 4 件だけ。動作はヘッドレス Chrome で写真 3 枚 → クロスフェード・ズームイン・テロップ → 10 秒再生を確認。

## Codex（3 件、ゲート PASS）
- [P2] 停止中に画面を回転するとプレビューが黒くなる（キャンバスのサイズ変更で内容が消えるのに、再描画の依存に入っていない）。
- [P2] 取り込み中に尺を編集できるが、次の写真の追加で均等割りに戻って消える（`importing` がローカル state）。
- [P2] スライダーのつまみと並べ替え・削除ボタンが 44px に満たない。

## 人間の判断（Codex 分）
- すべて採用。サイズを state に持って再描画の依存に加える。`importing` を store の `ui` に移し、一覧と編集パネルは取り込み中は操作を止める。
  `index.css` に range の共通スタイル（当たり判定 44px、つまみ 28px）、小ボタンは `min-h-11`。

## Claude `/code-review main..HEAD high`（10 件。1 回目は利用上限で途中終了し、再実行）
1. 再生中に素材を全部削除すると `isPlaying` が残り、「停止」が押せない。
2. `startedAt` を `performance.now()` で取るため、rAF の最初の時刻がそれより前だと経過時間が負になり 1 フレーム戻る。
3. 尺スライダーの `step=3` に均等割りの値（100 など）が乗らず、つまみと表示がずれる。つなぎのスライダーも同じ。
4. 末尾の素材で「クロスフェード」を押すと長さ 0 で保存され、チップは有効のまま描画はカット。
5. [altitude] 1 枚ずつ `addPhoto` して毎回割り直し、その副作用を 2 コンポーネントの `importing` ゲートで塞いでいる。まとめて 1 回追加すべき。
6. [reuse] `Thumbnail` の黒塗り → cover → drawImage は `drawCover` の再実装。
7. `eslint-disable-next-line react-hooks/exhaustive-deps` は oxlint に存在しない抑止で、読者を誤導する。
8. [efficiency] rAF ごとに `seek` が通知を出し、`s.project` 全体を購読しているので名前の 1 打鍵で再描画。
9. `onProbingChange={() => {}}` は死んだ配線。`busy` の名前が実態と合わない。
10. `ItemEditor.tsx` が 205 行。キャプションのチップ 9 連はデータ駆動にすべき。

## 人間の判断（Claude 分）
- すべて採用。
  - 1: `removeItem` で素材が無くなったら `isPlaying` を false に。停止ボタンは再生中なら押せる。
  - 2: `frameAtElapsed` で負の経過時間を 0 に（テスト追加）。
  - 3: step を 1 に。表示側で秒に丸める。
  - 4: 長さ 0 のクロスフェードはカットとして表示。末尾の素材ではチップを無効化。
  - 5: `addPhotos`（純粋関数と store）を追加し、取り込みが全部そろってから 1 回で追加。一覧と編集パネルの `importing` ゲートを外し、
    `importing` は入力の二重押し防止だけに。
  - 6: `Thumbnail` は `drawCover` を使う。
  - 7: 再生開始時の位置は `useAppStore.getState()` で読む。抑止コメントを削除。
  - 8: `seek` は同じフレームなら通知しない。購読を `items` / `preset` / `images` / `playheadFrame` に絞る。
  - 9: `EncodeProbePanel` から `onProbingChange` を外し、`isPlaying` で無効化。
  - 10: `Chip` / `ChipGroup` と `CaptionEditor` を切り出し。ItemEditor は 109 行。

## 2 者の比較
- 両方が指摘: 取り込み中の編集の扱い（Codex はゲートで止める、Claude はまとめて追加して根本から消す。Claude の案を採用し、Codex 案のゲートは縮小）。
- Codex だけ: 回転後の黒画面、44px。
- Claude だけ: 再生中の削除、負の経過時間、step の格子、長さ 0 のクロスフェード、再実装、死んだ配線、購読の粒度、行数。
- UI 層は Claude の指摘が多く、実際に挙動を追った指摘（step の正規化、rAF の時刻）が有効だった。

## 修正後の確認
- lint / typecheck / 170 件のテスト通過。ヘッドレス Chrome で写真 3 枚の一括追加 → クロスフェード・テロップ → 10 秒再生を再確認。

## 学び（教科書向けメモ）
- 「1 件ずつ処理して副作用をゲートで塞ぐ」より「まとめて 1 回処理する」ほうが単純になる。ゲートが増えたら設計を疑う。
- `<input type="range">` の `step` は値を格子に丸める。内部の単位（フレーム）と表示の単位（秒）を混ぜない。
- 使っていないリンターの抑止コメントは、読者に間違った前提を教える。
