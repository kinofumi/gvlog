# レビュー: 栞をイベントのチラシから構成

日付: 2026-11-13 / ブランチ: guide-from-flyer / 対象: 未コミットの差分（src/guide/nakaminato.ts と nakaminato.test.ts、components/EventGuide.tsx、ui/Icon.tsx の flag。チラシは docs/nakaminato001.jpg・002.jpg）

## Claude `/code-review medium`（8 件）

1. docs/nakaminato00*.jpg — チラシ画像 2 枚（約 5.2 MB、裏面に個人名と QR コード）が未追跡のまま docs/ にあり、`git add -A` でそのまま公開リポジトリに入る。→ **人間の判断待ち**: コミットには入れていない（下記）。
2. App.tsx:87 — つなげるの表紙の既定文字が「DESIGN QUEST in 那珂湊」になったが、表紙は 1 文字ずつ折り返すのでサイズ L・9:16 では「DESIGN QUE / ST in 那珂湊」と単語の途中で割れる。→ **反映**: 栞のデータに改行入りの `coverText`（'DESIGN QUEST\nin 那珂湊'）を持たせ、App はそちらを渡す（表紙の欄は textarea、wrapText は改行を尊重する）。
3. EventGuide.tsx:5 — リンクのクラス列が TipsGuide と合わせて 4 回書かれている（CLAUDE.md の「3 回以上は切り出す」に反する）。→ **反映**: `ui/ExternalLink.tsx` に切り出し、両方から使う。
4. nakaminato.ts:46 — キャッチコピーがチラシ表面 3 行のうち中央の「那珂湊の新しい魅力」を落としていた。→ **反映**: 3 行とも入れる。
5. nakaminato.ts:48 — 日時が「12:20〜」なのに集合は 12:15 で、見出しだけ見た人が遅れる。→ **反映**: 日時に「（勝田駅に 12:15 集合）」を添える。
6. nakaminato.test.ts:32 — 「さん」の有無だけ見るテストは弱く、「たくさん」で誤って落ちる（Codex の 1 と同じ）。→ **反映**: 会場名が「Artisan 海門」だけであることを見る具体的なテストに。
7. nakaminato.ts:56 — 大切にすることの 4 つ目と 13:35 の note がほぼ同文で、同じ画面に 2 回出る。→ **反映**: note は街歩きの行に固有のことだけに絞る。
8. EventGuide.tsx:35 — 時刻の無い行（Artisan 海門に集合）が空の枠だけで、いつ戻るのかが読み取れない。→ **反映**: 見出しを「街歩きのあと、Artisan 海門に集合・VLOG 編集」に。時刻はチラシに無いので書かない。

## Codex `codex exec`（read-only、medium。低 1 件）

1. 低 nakaminato.test.ts:29–31 — 「さん」が含まれないことだけでは個人名の確認になっていない。→ **反映**（Claude の 6 と同じ）。

## 人間の判断待ち

- チラシの画像 2 枚を公開リポジトリに入れるか。入れるなら縮小（長辺 1600px 程度）して裏面の個人名を含む部分をどう扱うか。入れないなら `.gitignore` に `docs/nakaminato00*.jpg` を足す。
- 表面の画像を起動時の表紙（public/splash.png）に使うか。
