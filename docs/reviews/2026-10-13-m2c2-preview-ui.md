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
