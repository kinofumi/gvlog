# 2026-10-14 M3(B1) 動画素材をモデルと store に追加、の二重レビュー

対象: `main..m3-video`（`timeline/trim.ts`、`projectActions` の `addItems` / `setTrimStart`、store の動画の所有、
`export/videoSources.ts`、`exportProject` への接続）。約 300 行（半分はテスト）。

## Codex（2 件）
- [P2] `NewEntry` の `video` が任意で `info.kind` と連動していない。動画なのに実体なしで store に入り、書き出しで初めて失敗する（再現済み）。
- [P3] `createVideoSources` と `exportProject` の組み立てにテストがない（引数の渡し間違い、組み立て中の解放漏れを検出できない）。

## Claude `/code-review main..HEAD high`（9 件）
1. `NewEntry` の `video?`（Codex P2 と同じ）。
2. 動画の実体チェックが `pickEncoder`（遅い診断）の後にある。
3. `createVideoSources` が 2 本目で失敗すると 1 本目のデコーダが解放されない。
4. `setTrimStart` が自前で compile と clamp をしたあと、`withItems` → `clampTrims` でもう一度同じ計算をする。
5. `removeItem` が画像を閉じてから `dispose()` → `set` の順なので、`dispose()` が投げると閉じた画像が状態に残る。
6. `addItems` の `isNew` 判定が「items にあり images に無い」なので、既存 ID の再追加で early return の前に受け取った画像・動画が漏れる。
7. `createVideoSources` にテストがなく、`VideoFrameSource` を直接 `new` するのでフェイクも差し込めない。
8. `projectActions.ts` が 228 行。
9. `images` と `videos` を並行に持つので、所有・解放の同期を 2 か所で手で合わせている。1 つの Record にまとめる案。

## 人間の判断
- Codex P2 / Claude 1: 採用。`NewPhoto | NewVideo` のユニオンにし、動画は `video` 必須。
- Codex P3 / Claude 7: 採用。`createVideoSources` はデコーダを作る関数（factory）を受け取り、フェイクでテスト（引数、写真のみ、実体の欠落）。
  `exportProject` 自体のテストは DOM（Canvas）が要るので今回も書かない（記録）。
- Claude 2, 3: 採用。デコーダは `pickEncoder` の前に作り、途中で失敗したら作った分を解放してから投げる（テスト追加）。
- Claude 4: 採用。`setTrimStart` は値を整えて置き換えるだけにし、上限への切り詰めは `clampTrims` の 1 か所に寄せる。
  「同じ値」の判定は切り詰め後の値で行う。`setCaption` などでも `clampTrims` が走るが、compile は安価なので許容。
- Claude 5: 採用。先に `set` で状態から外してから解放する。
- Claude 6: 採用。`isNew` は「この呼び出しで新しく入った ID」（前に無く、後にある）で判定。
- Claude 8: 採用。`clampTrims` を `timeline/trim.ts` へ（テスト追加）、`PhotoInfo` / `VideoInfo` を `model/types.ts` へ。198 行。
- Claude 9: **保留**。`images` は描画（renderFrame / サムネイル）、`videos` は書き出しとプレビューの `<video>` と使い手が違い、
  分けたままのほうが呼び出し側が単純。M4（IndexedDB からの復元）で所有の形を見直すときに再検討する。

## 2 者の比較
- 両方が指摘: `NewEntry` の型（Codex は再現で根拠を示し、Claude は失敗が遅れて出ることを指摘）、`createVideoSources` のテスト不足。
- Codex だけ: なし（2 件とも Claude と重なる）。Codex は mediabunny の内部まで追って「デコーダが残る」という自分の仮説を取り下げた。
- Claude だけ: 診断の前に検証、途中失敗の解放、二重計算、解放の順序、`isNew` の漏れ、行数、所有の構造。
- 今回は Codex が少なく Claude が多い。差分が純粋関数と状態の変更で、Claude の「契約と順序」の観点が効いた。

## 修正後の確認
- lint / typecheck / 200 件のテスト通過。実機と出力の確認は B2（取り込み UI）のあとに行う。

## 学び（教科書向けメモ）
- 「任意のフィールド」は型で守れない条件を生む。種類ごとの型（ユニオン）にすると、足りない入力はコンパイルで止まる。
- 解放を伴う状態変更は「先に状態を変え、あとで解放する」。逆だと、解放の失敗で壊れた参照が状態に残る。
- 複数の資源を順に作る関数は、途中で失敗したときの解放まで責任を持つ（作った分だけ戻す）。
