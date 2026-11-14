# 第 9 章 仕上げと次の一歩

> 題材: `docs/adr/`、`docs/plan.md`、`docs/devlog/`、`CLAUDE.md`
> 目標: このリポジトリの開発の流れを自分で一周できる。次に読む層が分かる。

## 1〜8 章で読んだもの、読んでいないもの

読んだ: `model`、`timeline`、`state`、`components` の一部、`export/withTimeout`、`guide`。
読んでいない: `render`（Canvas に 1 フレームを描く）、`export`（WebCodecs と mediabunny で MP4 にする）、`preview`（`<video>` と Canvas で再生）、`media`（ファイルの取り込み）、`bgm`（音声のデコードと AAC）、`join`（つなげる）。

読んでいない層は、TypeScript の文法としては新しいものがほとんど無い。難しさはブラウザ API の仕様にある。入口を 3 つだけ案内する。

- **`src/render/renderFrame.ts`**: 「フレーム番号 → Canvas に描く」の 1 関数。`timeline/compile.ts` の結果（`itemsAt`、`transitionAt`）を受け、写真の動き（`kenBurns.ts`）とテロップ（`drawCaption.ts`）を描く。Canvas の `drawImage` を知っていれば読める。テストは `@napi-rs/canvas` で Node 上で描いて確かめている。
- **`src/export/exportVideo.ts`**: 1 フレームずつ `renderFrame` で描き、WebCodecs の `VideoEncoder` に渡し、mediabunny で MP4 に詰める。`withTimeout` と `AbortSignal`（5 章）がここで使われている。
- **ADR 008、015、016、019**: フレームを整数で持つ理由、尺の規則、白フェードの決め方、BGM の扱い。コードを読む前に ADR を読むと、「なぜそうなっているか」が先に分かる。

## 開発の一周（このリポジトリの約束）

勉強の仕上げとして、小さな変更を本番の流れで一周する。題材は 6 章の演習 6-2（合計の文に素材の数を出す）か、7 章の 7-3（選択中の枠を青に）がよい。見た目だけの変更なので二重レビューは省略できる（devlog に明記）。

1. **ブランチ**: `git checkout main && git checkout -b total-count`
2. **テスト**（純粋関数を触るなら先に）
3. **実装**
4. **3 つ通す**: `npm run lint`、`npm run typecheck`、`npm test`。それから `npm run format`。
5. **目で見る**: `npm run dev` でスマホ幅にして確かめる。
6. **devlog**: `docs/devlog/YYYY-MM-DD.md` に 3〜5 行。「何を、なぜ、どう確かめたか、レビューを省いた理由」。
7. **コミット**: メッセージは日本語 1〜2 行で「何を、なぜ」。
8. **main に合流**: `git checkout main && git merge --no-ff total-count && git branch -d total-count`
9. **プッシュ**: `git push origin main`。GitHub Actions が Pages に配る。`gh run watch` で終わるのを見る。

新しい機能や構造の変更なら、4 と 5 の間に **二重レビュー**（Claude の `/code-review` → Codex → 自分の判断。`docs/plan.md` §14）を入れ、結果を `docs/reviews/` に残す。設計の判断を伴うなら ADR を 1 本書く。

## AI との付き合い方（勉強の場面で）

このリポジトリは「AI との開発の教科書」になる。勉強中の使い方も、その記録の一部になる。

よい頼み方:

- 「`src/timeline/clamp.ts` を Python で書き直して、違いを 3 つ説明して」
- 「`remainingFrames` のテストを先に 3 つ書いて。実装はまだ書かないで」
- 「この `className` の各クラスが何をしているか、1 行ずつ」
- 「自分で書いたこの関数をレビューして。CLAUDE.md の平易さのルールに照らして」

避けたい頼み方:

- 「この章の演習を全部やって」（自分で赤を見ないと身につかない）
- 「もっと賢い書き方にして」（CLAUDE.md の方針に反する。賢くない書き方が正解）

分からない用語は、まず `docs/study/python-to-typescript.md`（付録）を見る。無ければ AI に「Python の ○○ に当たるものは？」と聞き、分かったら付録に 1 行足す。

## 勉強の記録を教科書に戻す

`docs/study/notes.md` に残した「詰まった場所」は、読者が詰まる場所でもある。章立てが終わったら、

- 各章の「答え合わせ」に足す
- 本文の説明を直す
- CLAUDE.md の「平易さのルール」に項目を足す

のどれかに戻す。これも 1 ブランチ 1 変更で。

## 次に学ぶなら

- **React をもう少し**: `useEffect`（副作用）、`useRef`（DOM への参照）、`useMemo`。`PreviewCanvas.tsx` と `usePreview.ts` に全部出てくる。
- **Canvas**: `src/render/` を `renderFrame.test.ts` から読む。
- **WebCodecs**: `docs/plan.md` の「技術調査の結論」と ADR 002、009 を先に読み、`src/export/encoder.ts` へ。
- **Tailwind をもう少し**: 公式ドキュメントの「Core concepts」だけ読む。このアプリで使っていないグリッド、アニメーション、ダークモードは必要になるまで読まない。

## この章のまとめ

- 開発の一周（ブランチ → テスト → 実装 → 3 つ通す → 目で見る → devlog → コミット → 合流 → プッシュ）を自分でやる。
- 次の層は、ADR を先に読んでからコードへ。
- 詰まった記録は教科書の材料。戻す。
