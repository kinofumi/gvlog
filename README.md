# gvlog

グループで街を歩き、各自がスマホで撮った写真と動画から短い縦動画（MP4）を作り、最後に全員分をつなげて 1 本にする Web アプリ。
すべてブラウザの中で動き、サーバーもアプリのインストールも要らない。GitHub Pages で配信している。

- 公開 URL: https://kinofumi.github.io/gvlog/
- 最初の本番: 2026 年 11 月 28 日のイベント「DESIGN QUEST in 那珂湊」（詳しくはアプリの「イベントの栞」タブ）

このリポジトリは、完成後に「AI との開発の教科書」として整備する前提で進めている（[CLAUDE.md](CLAUDE.md)、[docs/plan.md](docs/plan.md) §13）。
読者はプログラミング経験者で、TypeScript と Tailwind は初心者、という想定。

## 画面

開くと表紙（イベントのチラシ）が 2 秒出て、そのあと 4 つのタブに分かれる。

| タブ         | 役割                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| イベントの栞 | 日時、当日の流れ、会場。移動する行には Google マップへのリンク                                                                                            |
| おすすめ     | 街歩きで撮る場所の候補と地図へのリンク                                                                                                                    |
| 動画編集     | 写真と動画を選び、1 コマずつ尺・テロップ・トリムを決めて、自分の MP4 を書き出す。共有シートから写真アプリに保存できる                                     |
| つなげる     | 集めた全員の MP4 を順に並べ、表紙と BGM を付けて 1 本の MP4 にする。各自の動画は端末ごとに違うエンコーダで作られているので、読み直して描き直す（ADR 017） |

## 作れる動画

| 項目         | 値                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------- |
| 形式         | MP4（H.264）、1080x1920（縦）、30fps                                                         |
| 各自の動画   | 1 コマ 5 秒から始めて自由に変えられる。合計は 15 秒まで（超えた分は切れる）。音声なし        |
| 写真         | ゆっくり寄る・引く動き（ケン・バーンズ効果）                                                 |
| 動画         | 始点と終点のトリム。入力は 4K、200 MB まで                                                   |
| テロップ     | 1 コマに 1 つ。1 書体                                                                        |
| コマのつなぎ | 白フェード                                                                                   |
| つなげる     | 表紙（文字）、各自の動画、終わり。BGM（AAC）はループして末尾でフェードアウト。合計 10 分まで |

対応する端末とブラウザは、実機で書き出しまで確認できたものだけを [docs/support-matrix.md](docs/support-matrix.md) に載せている。
WebCodecs を使うので、iPhone は Safari 16.4 以降（BGM 付きの「つなげる」は音声のエンコードが要るので Safari 26 以降）、Android と PC は Chrome が対象。HTTPS でないと動かない。作れない端末では画面に理由を出す。

## 開発

Node.js 22 を使う（GitHub Actions と同じ）。

```sh
npm ci
npm run dev
```

開発サーバーは LAN 上のスマホから HTTPS で開けるように自己署名証明書を使う（`@vitejs/plugin-basic-ssl`）。
PC のブラウザだけで試すときは `NO_SSL=1 npm run dev` で HTTP にできる。URL の末尾は `/gvlog/`。

| コマンド             | 内容                          |
| -------------------- | ----------------------------- |
| `npm run dev`        | 開発サーバー                  |
| `npm test`           | Vitest でテストを 1 回実行    |
| `npm run test:watch` | テストを監視実行              |
| `npm run lint`       | oxlint（ADR 011）             |
| `npm run typecheck`  | `tsc -b`                      |
| `npm run format`     | Prettier で `src/` を整形     |
| `npm run build`      | 型検査のあと `dist/` にビルド |
| `npm run preview`    | ビルド結果を確認              |

lint、typecheck、test の 3 つが通らない差分はレビューに出さない（CLAUDE.md）。

### 配信

`main` に push すると GitHub Actions（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）がテストとビルドを行い、GitHub Pages に公開する。
手作業の手順はない。

## ディレクトリ

```
src/
  model/      データ型と既定値（プリセット、素材、コマ）
  timeline/   尺とトリムの計算（純粋関数。React や DOM に触らない）
  render/     1 フレームを canvas に描く（ケン・バーンズ、テロップ、フェード。純粋関数）
  preview/    画面での再生
  export/     エンコーダの選定、フレームの供給、MP4 の書き出し、共有
  media/      写真と動画の取り込み、上限
  join/       「つなげる」のプロジェクト組み立てと表紙
  bgm/        BGM の読み込み、ループとフェードの計算
  guide/      栞とおすすめのデータ、地図リンク
  state/      zustand のストア
  components/ 画面の部品（ui/ は見た目だけの小さな部品）
public/
  splash.jpg  表紙の画像
  bgm/        BGM の音源
docs/         計画、ADR、devlog、レビュー記録、対応表、チェックリスト
scripts/      補助スクリプト
```

依存の方向は `model → timeline → render → (preview | export)`。`timeline/` と `render/` はブラウザ API を import しないので、Node のテストでそのまま動く。
外部ライブラリは plan §10 の表にあるものだけ（React、zustand、mediabunny、Tailwind CSS）。

## 進め方

- 1 つの変更 = 1 ブランチ。差分は 300 行程度。`main` には `--no-ff` でマージする
- 純粋関数はテストファースト。テスト名は日本語の文
- 新しい機能や構造の変更は、Claude の `/code-review` と Codex の二重レビューを経て人間が判断する（ADR 006、plan §14）。結果は `docs/reviews/` に残す
- 設計の判断は `docs/adr/` に 1 件 1 ファイル。セッションの終わりに `docs/devlog/` を書く
- マイルストーンの完了時に git タグ（`m0` 〜）を打つ

## 状態（2026-11-13）

- M0〜M3（成立検証、タイムライン、写真と描画、動画と書き出し）まで完了（タグ `m0`〜`m3`）
- フィールドテストの要望を反映中: 各コマの尺を独立に（ADR 015）、「つなげる」（ADR 017）、BGM（ADR 019）、栞とおすすめ、表紙（ADR 021）
- 未着手: M4（プロジェクトの保存と復元）、M5 の仕上げの一部。BGM は仮の曲で、本番の曲に差し替える予定

## ドキュメント

- [docs/idea.md](docs/idea.md) — 元の構想
- [docs/plan.md](docs/plan.md) — 要件、設計、ロードマップ、テスト方針、レビュー体制
- [docs/adr/](docs/adr/) — 設計判断の記録（一覧は [docs/adr/README.md](docs/adr/README.md)）
- [docs/devlog/](docs/devlog/) — セッションごとの作業記録
- [docs/reviews/](docs/reviews/) — レビュー記録（Claude ＋ Codex）
- [docs/support-matrix.md](docs/support-matrix.md) — 実機で確認できた端末とブラウザ
- [docs/testing-checklist.md](docs/testing-checklist.md) — 実機チェックリスト
- [CLAUDE.md](CLAUDE.md) — AI と人間の共通ルール
