# gvlog で学ぶ TypeScript と Tailwind — 勉強プラン

> 作成日: 2026-11-14。対象は「Python は中級、TypeScript と Tailwind は初めて」の人。
> 題材はこのリポジトリのコードそのもの。読む → 動かす → テストを書いて直す、の順で進む。

## ねらい

- gvlog のコードを、人に説明できる程度に読めるようになる。
- 小さな機能なら、テストを先に書いてから自分で足せるようになる。
- Tailwind のクラスを見て、画面のどこがどう変わるか想像できるようになる。

React そのものの深い理解は目標にしない。「関数が画面を返す」「状態が変わると関数がもう一度呼ばれる」の 2 点だけ押さえる。

## 進め方の約束

- **本番と分ける。** 演習は `study` ブランチで行う。イベント（2026-11-28）までは main に混ぜない。実機で使うときは `git checkout main` に戻す。

  ```sh
  git checkout -b study        # 最初の 1 回
  git checkout study           # 勉強を再開するとき
  git checkout main            # 本番のアプリに戻るとき
  ```

- **1 章 = 1 回（60〜90 分）。** 週 2 回で 5 週間。急がない。
- **読むだけで終わらせない。** 各章の演習を最低 1 つやる。テストを赤くしてから緑に戻す。
- **詰まったら記録する。** `docs/study/notes.md` を自分で作り、「分からなかったこと」「調べて分かったこと」を 1 行ずつ残す。これはあとで教科書の「つまずきやすい場所」の材料になる。
- **AI は辞書と相棒として使う。** 「このファイルを Python で書くとどうなる？」「この関数のテストを先に書いて」と頼むのはよい。答えをまるごと貼るのは、自分で一度書いてから。

## 章立て

| 章  | テキスト                                              | 題材のファイル                                        | 身につくこと                                     |
| --- | ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| 1   | [道具をそろえる](01-tools.md)                         | `package.json`、`tsconfig.app.json`                   | npm スクリプト、Vite、vitest、型チェック、lint   |
| 2   | [型を読む](02-types.md)                               | `src/model/types.ts`、`src/model/validate.ts`         | 型エイリアス、リテラル型、union、`?`、`unknown`  |
| 3   | [関数とテスト](03-functions-and-tests.md)             | `src/timeline/durations.ts`、`frameStep.ts`           | 関数の書き方、`number` の罠、vitest、TDD         |
| 4   | [配列とオブジェクトを壊さずに変える](04-immutable.md) | `src/timeline/clamp.ts`、`compile.ts`                 | `map`/`filter`、スプレッド、ジェネリクスの最小限 |
| 5   | [非同期](05-async.md)                                 | `src/export/withTimeout.ts`                           | Promise、`async`/`await`、中断                   |
| 6   | [React の部品を読む](06-react.md)                     | `src/components/ui/`、`FrameSlider.tsx`、`TabBar.tsx` | JSX、props、条件描画、一覧の描画、`useState`     |
| 7   | [Tailwind](07-tailwind.md)                            | `Section.tsx`、`Button.tsx`、`src/index.css`          | ユーティリティクラス、数の意味、状態、並び順     |
| 8   | [状態とデータの流れ](08-state.md)                     | `src/state/store.ts`、`projectActions.ts`             | zustand、セレクタ、純粋関数に任せる設計          |
| 9   | [仕上げと次の一歩](09-next.md)                        | `docs/adr/`、`docs/plan.md`                           | 開発の流れ、AI との付き合い方、次に読む層        |

付録: [Python と TypeScript の対照表](python-to-typescript.md)

## HTML 版

Markdown が元データで、同じ内容の HTML 版を `docs/study/html/` に置いている（章ごとの `01-tools.html` …、`index.html` がこのプラン、`all.html` が全章を 1 ファイルにしたもの。どれも CSS を埋め込んだ 1 ファイルで、画像や外部の読み込みは無い。ブラウザで開くか、印刷して使う）。
本文を直したら `scripts/make-study-html.sh` で作り直す（pandoc が要る。`brew install pandoc`）。HTML を直接直さない。

## 読む順番の理由

1〜5 章は **ブラウザも React も出てこない**。純粋関数とテストだけなので、Python の知識がそのまま効く。TypeScript の文法に慣れるのはここで済ませる。

6〜8 章で画面に入る。React、Tailwind、zustand は別々のものなので、1 章ずつ分けた。6 章では見た目のクラスを読み飛ばし、7 章で初めてクラスを見る。

`src/render/`、`src/export/`、`src/bgm/` は扱わない。Canvas、WebCodecs、mediabunny の知識が主で、TypeScript の勉強としては遠回りになる。9 章で入口だけ案内する。

## 毎回の手順

1. `git checkout study`、`npm run dev` でアプリを開いておく（PC なら `NO_SSL=1 npm run dev`）。
2. 別のターミナルで `npm run test:watch` を動かしておく。ファイルを保存するたびにテストが走る。
3. 章のテキストを読みながら、題材のファイルをエディタで開く。
4. 演習をやる。終わったら `npm run lint`、`npm run typecheck`、`npm test` の 3 つを通す。
5. `docs/study/notes.md` に 1〜3 行書く。

## 先に知っておくとよい、Python との大きな違い

- **数は 1 種類。** `number` に int と float の区別がない。`7 / 2` は `3.5`。整数にしたいときは `Math.floor` を自分で呼ぶ（このアプリはフレーム番号を整数で持つので、至るところで呼んでいる。ADR 008）。
- **「無い」が 2 つある。** `undefined`（未設定）と `null`（意図して空）。このアプリでは、省略できるフィールドは `undefined`、「選んでいない」は `null` と使い分けている。
- **`const` は再代入禁止であって、不変ではない。** `const items = []` でも `items.push(x)` はできる。不変にしたいなら、変えずに新しい値を作る（4 章）。
- **型は実行時に消える。** 型チェックは `tsc` がビルド前にやるだけ。実行中には型情報は無い。外から来た値（JSON、ファイル）は `unknown` として受けて自分で確かめる（2 章の `validatePreset`）。
- **インデントではなく波括弧。** セミコロンはこのリポジトリでは付けない（prettier の設定）。
