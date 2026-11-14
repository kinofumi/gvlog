# 第 1 章 道具をそろえる

> 題材: `package.json`、`tsconfig.app.json`、`vite.config.ts`
> 目標: 5 つのコマンドの役割が言える。テストを 1 つ壊して、その出力を読める。

## Python との対応

| Python                     | このリポジトリ                 | 役割                                   |
| -------------------------- | ------------------------------ | -------------------------------------- |
| `python` 3.x               | Node.js 22                     | 実行環境（開発時のみ。本番はブラウザ） |
| `pip` + `requirements.txt` | `npm` + `package.json`         | 依存の管理                             |
| `pip install -r ...`       | `npm ci`                       | 依存を入れる（`node_modules/`）        |
| `venv`                     | `node_modules/`                | プロジェクトごとの依存の置き場         |
| `pytest`                   | `vitest`（`npm test`）         | テスト                                 |
| `mypy`                     | `tsc`（`npm run typecheck`）   | 型チェック                             |
| `ruff check`               | `oxlint`（`npm run lint`）     | 静的検査                               |
| `ruff format` / `black`    | `prettier`（`npm run format`） | 整形                                   |
| `python -m http.server`    | `vite`（`npm run dev`）        | 開発サーバー（ホットリロード付き）     |

Python では「実行＝型を見ない」だが、TypeScript では **型チェックとビルドが別の工程** として先に走る。`npm run build` が `tsc -b && vite build` になっているのはそのため。型が合わないと、ブラウザに届く前に止まる。

## package.json を読む

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "typecheck": "tsc -b",
  "test": "vitest run",
  "test:watch": "vitest",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
}
```

`npm run <名前>` でここに書いたコマンドが動く。`test` だけは `npm test` と短く呼べる。

`dependencies` はブラウザに届くもの（React、zustand、mediabunny、Tailwind）。`devDependencies` は開発中だけ使うもの（TypeScript、Vite、vitest、prettier）。Python の `requirements.txt` と `requirements-dev.txt` の分け方と同じ。

CLAUDE.md の約束どおり、外部ライブラリは `docs/plan.md` §10 の表にあるものだけ。勉強中に「便利そうだから」とライブラリを足さない。

## tsconfig.app.json の、読むべき 4 行

```json
"target": "es2023",
"lib": ["ES2023", "DOM"],
"noUnusedLocals": true,
"noUnusedParameters": true,
```

- `target` と `lib`: どの年代の JavaScript とブラウザ API を使えるとみなすか。`DOM` が入っているので `document` や `HTMLButtonElement` の型が使える。
- `noUnusedLocals` / `noUnusedParameters`: 使っていない変数や引数があると **エラー**。Python の「警告」より厳しい。消し忘れを型チェックが見つける。

残りの行は Vite のための設定で、今は読まなくてよい。

## vite.config.ts

```ts
export default defineConfig({
  base: '/gvlog/',
  plugins: [react(), tailwindcss(), ...(useSsl ? [basicSsl()] : [])],
  server: { host: true },
})
```

- `base`: GitHub Pages の URL が `/gvlog/` 配下なので、リンクの先頭に付ける。
- `plugins`: React（JSX の変換）、Tailwind（クラスから CSS を作る）、HTTPS（スマホから開発サーバーを開くため）。
- `...(useSsl ? [basicSsl()] : [])`: 条件によって要素を足す書き方。Python の `*([basic_ssl()] if use_ssl else [])` と同じ。

## やってみる

### 演習 1-1 全部動かす

```sh
npm ci
npm run typecheck
npm run lint
npm test
```

3 つとも何も言わずに（またはテストの件数だけ出して）終わるのが正常。テストは 29 ファイル、全部通る。

### 演習 1-2 テストを 1 つ壊す

`src/timeline/durations.test.ts` を開き、

```ts
expect(maxItems(450)).toBe(15)
```

の `15` を `14` にして保存する。`npm test` を走らせ、出力を読む。

- どのファイルの、どのテスト名が落ちたか（日本語の文で出る）。
- `Expected` と `Received` が何か。
- 行番号。

読めたら元に戻す。`git diff` が空になることを確かめる。

### 演習 1-3 型チェックを 1 つ壊す

`src/timeline/durations.ts` の `maxItems` の中に、使わない変数を 1 行足す。

```ts
const unused = 1
```

`npm run typecheck` が何と言うか読む。`npm test` は **通る** ことも確かめる（テストは型を見ない）。読めたら元に戻す。

### 演習 1-4 watch モード

`npm run test:watch` を動かしたまま、演習 1-2 をもう一度やる。保存した瞬間に赤くなり、戻した瞬間に緑になるのを見る。以降の章はこの状態で進める。

## 答え合わせ

- 1-2: `FAIL src/timeline/durations.test.ts > maxItems（素材数の上限） > 15 秒（450 フレーム）なら最小尺 1 秒で 15 個まで`、`Expected: 14`、`Received: 15` が出る。
- 1-3: `error TS6133: 'unused' is declared but its value is never read.` が出る。`npm test` は通る。

## この章のまとめ

- 型チェック（tsc）、検査（oxlint）、テスト（vitest）は別の道具で、別のことを見る。3 つとも通してからレビューに出す、がこのリポジトリの約束。
- テストの出力は「ファイル > describe > it の名前 > Expected / Received」の順に読む。
