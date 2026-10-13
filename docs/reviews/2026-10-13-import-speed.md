# 2026-10-13 写真取り込みの高速化の二重レビュー

対象: `main..m2-import-speed`（`media/importImage.ts` の書き換え、`PhotoPicker` の進捗・計測表示・iPhone 向け案内）。
きっかけ: iPhone で「写真追加時にもたつく」。

## Codex（2 件、ゲート PASS）
- [P2] 「`<img>` はヘッダーだけ読む」は仕様で保証されていない（`load` は画像データ全体の取得を待つ。デコードの時期はブラウザ次第）。
- [P2] 旧 Safari（15）は `<img>` が EXIF を適用し Blob からの `createImageBitmap` は適用しない実装があり、保険の縮小が縦横比を壊す。

## Claude `/code-review main..HEAD high`（7 件）
1. `<img>`（EXIF 適用後）の寸法と `createImageBitmap` の縮小が食い違う経路があり、保険の縮小が写真を潰す。縦横比の一致を確認すべき。
2. `naturalWidth` が 0（SVG など）でゼロ除算になり、MediaError でない例外が出る。
3. 縮小品質が 'high' から 'medium' に黙って下がっている。
4. 保険の Canvas 縮小は対象ブラウザでは通らない二重経路。
5. iPad の Safari は UA が Macintosh なので案内が出ない。
6. 計測表示の key に文字列をそのまま使い、重複しうる。
7. 縦撮り写真（EXIF 回転付き）の実機確認項目がない。

## 人間の判断
- Codex 1: 採用。コメントを「寸法は `<img>` の load で読む。デコードが 1 回と保証されているわけではない」に直し、
  iPhone で体感で速くなったことを根拠として記録（PC では差が出ない: 70〜85ms）。
- Codex 2 / Claude 1, 4: 採用。保険の経路は `<img>` から Canvas に描く形にし（回転の適用が寸法の計算と同じ側に揃う）、
  条件に「縦横比が `<img>` と食い違う」を加えた。二重経路ではなく「期待どおりに適用されなかったときの保険」と位置づけ、
  対象ブラウザでは通らない想定を書き、通ったら対応表に記録する。
- Claude 2: 採用。寸法 0 は取り込み時点で MediaError。
- Claude 3: 採用（理由をコメントに）。出力の 2 倍の大きさに縮めるので medium で足りる。high は Chrome で目に見えて遅い。
- Claude 5: 採用。`Macintosh` かつ `maxTouchPoints > 1` を iPad とみなす。
- Claude 6: 採用。key は index。
- Claude 7: 採用。チェックリストに追加。
- 試して効かなかったこと: `accept` に HEIC を明示して iOS の変換を避ける案（iOS 18.7 は変換して渡す）。`image/*` に戻した。

## 2 者の比較
- 両方が指摘: `<img>` と `createImageBitmap` の EXIF の扱いの不一致（Codex は旧 Safari の報告を根拠に、Claude は縦横比の検証がないことを指摘）。
- Codex だけ: 「ヘッダーだけ」の断定が仕様で保証されないこと。
- Claude だけ: 寸法 0、品質の変更、iPad、key、チェックリスト。

## 修正後の確認
- lint / typecheck / 170 件のテスト通過。ヘッドレス Chrome で 12MP の JPEG を取り込み（79ms）。iPhone は再確認を依頼。

## 学び（教科書向けメモ）
- 「速くなった」の根拠は実機の体感と PC の数値を分けて書く。仕様で保証されないことは「保証されない」と書く。
- 2 つの API に同じ前提（EXIF の適用）を置くときは、結果を突き合わせる検査を入れる。
