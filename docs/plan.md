# gvlog 開発プラン（Vlog 素材作成 Web アプリ）

> 作成日: 2026-10-08。元の構想は [idea.md](./idea.md)。
> 改訂 v2（2026-10-08）: Codex レビュー（[reviews/2026-10-08-plan-codex-consult.md](./reviews/2026-10-08-plan-codex-consult.md)）を反映。
> 主な変更: M0 を縦割りの成立検証に変更、内部時間を整数フレームに統一、v1 を H.264 / MP4 / 30fps に限定、
> 非同期デコードと同期描画の接続を明文化、HTTPS の検証環境、レビュー体制の整理。

## Context（背景と目的）

グループで Vlog を制作するにあたり、各メンバーが自分のスマホ（iPhone / Android）または PC で、複数の写真・動画から
「固定尺（既定 10 秒）の短尺 MP4 素材」を作れるブラウザ完結型アプリを作る。サーバー不要・無料運用・ログイン不要で、
URL を共有するだけで全員が使える。仕上げ担当者は各自の MP4 を CapCut / Vrew に並べて BGM・読み上げ・全体編集を行う。

このリポジトリは完成後に「AI との開発の教科書」にする（§13）。

## 確定済みの要件・決定事項

| 項目           | 決定                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 対応端末       | iPhone (Safari 16.4+、推奨 iOS 17+) / Android (Chrome) / PC (Chrome, Edge, Safari 26+)。対応表には M0 で実機確認できた条件だけを載せる |
| 技術基盤       | Vite + React + TypeScript、静的サイト。状態管理 zustand、永続化 idb-keyval                                                             |
| ホスティング   | GitHub Pages（GitHub Actions で自動デプロイ）                                                                                          |
| 素材           | 1 プロジェクトに複数の写真・動画（上限は §2）。写真はケン・バーンズ効果、動画は開始位置トリム                                          |
| 時間配分       | 固定尺を素材数で自動均等割り（端数はフレーム単位で先頭から配る）。素材ごとにスライダーで手動調整可                                     |
| 固定モード     | グループプリセットで「縦横比」「合計尺」「解像度」をロック。fps は v1 では 30 固定。既定値 9:16 / 1080x1920 / 10 秒                    |
| テロップ       | プリセット 3 種（帯 / 縁取り / 半透明ボックス）＋ 文字色・背景色・フォント個別調整。位置 上中下、サイズ 大中小                         |
| フォント       | OFL の日本語 Web フォントを同梱。v1 は 1 書体（Noto Sans JP Bold）、M5 で 2〜3 書体に増やす                                            |
| トランジション | v1 は cut と crossfade。fadeBlack / fadeWhite / slide は後の章（M6）                                                                   |
| 音声           | 出力に音声を含めない（無音 MP4）。入力動画の音声は破棄                                                                                 |
| 保存           | IndexedDB に自動保存。保証するのは「保存済みと表示された状態からの復元」                                                               |
| 出力           | MP4 (H.264) のみ。端末が H.264 をエンコードできない場合は非対応として止める（WebM への切替はしない）                                   |
| ドキュメント   | 本プラン、ADR、devlog、レビュー記録を `docs/` に残す                                                                                   |

## 技術調査の結論（2026-10 時点）

- **WebCodecs**: Safari 26 で完全対応。Safari 16.4〜18 は Video 系のみ（音声不要なので問題なし）。
  iOS Safari では H.264 Baseline (`avc1.42xxxx`) のエンコードが安定、High Profile は不安定。
  **WebCodecs と Web Share API は secure context（HTTPS または localhost）でしか使えない。** LAN の `http://<IP>` では動かない。
- **mediabunny**（MPL-2.0、TypeScript、依存ゼロ、tree-shakable）を採用候補とする。WebCodecs 上に
  MP4/WebM/MOV の mux/demux、`CanvasSource`（Canvas→動画トラック）、`VideoSampleSink` / `CanvasSink`
  （順次デコード、回転メタデータ処理、`sample.close()` でメモリ解放）、`canEncodeVideo()` / `track.canDecode()` を提供。
  **採用の確定は M0 で実素材が最後まで通ってから**（Codex 指摘 1）。
- **不採用**: ffmpeg.wasm（スマホに重い。GitHub Pages は COOP/COEP 不可で SharedArrayBuffer が使えない）、
  webm-muxer / mp4-muxer（mediabunny が後継）。
- **iPhone 素材**: iOS 13.6 以降、動画はファイル選択時に変換されず HEVC の MOV がそのまま渡される → iOS Safari の
  WebCodecs で HEVC をデコード。HEIC 写真は通常 JPEG に変換されて渡される。Android Chrome の HEVC はハードウェア依存。
  デコード不可時は WASM フォールバックではなく明確なエラー表示（v1）。
- **保存**: iOS では `navigator.share({files})` で MP4 を写真アプリに保存できる。共有はユーザー操作（ボタン押下）の中でしか
  呼べないため、書き出し完了後に自動では開けない。`<a download>` は副手段。
- **メモリ**: iOS Safari はタブのメモリが尽きると強制終了される。上限値は端末により異なり、安全予算としては使えない。
  入力側に上限を設け（§4）、必要な分だけ展開し、失敗・キャンセル時に一括解放する。
- **能力判定の限界**: `canEncodeVideo()` / `canDecode()` の成功は、実ファイルを最後まで処理できる保証ではない。
  成立の証明は実素材での書き出し（M0）で行う。

## 1. ディレクトリ / モジュール構成

v1 で作るのは太字のモジュールだけ。他は後の章で追加する（最初から全部は作らない）。

```
gvlog/
  .github/workflows/deploy.yml      # build → actions/deploy-pages
  vite.config.ts                    # base: '/gvlog/'、plugin-basic-ssl（LAN 実機検証用 HTTPS）
  public/fonts/*.woff2              # テロップ用サブセットフォント（v1 は 1 書体）
  docs/                             # plan, adr, devlog, reviews, testing-checklist
  src/
    main.tsx, App.tsx               # 画面切替は store の ui.screen（react-router 不使用）
    screens/                        # Home / Media / Edit / Preview / Export
    components/                     # Slider, Chips, BottomSheet, Stepper, PreviewCanvas, ProgressBar
    components/ui/                  # shadcn/ui のコピー
    **model/**                      # types.ts, defaults.ts, validate.ts（プリセット・保存データの検証）
    **timeline/**                   # compile.ts, durations.ts, clamp.ts  ← 純粋関数・Vitest 対象
    **render/**                     # renderFrame.ts, drawCaption.ts, kenBurns.ts, easing.ts, progress.ts, caption.ts（折り返し・配置・フェード）,
                                    # coverRect.ts, drawCover.ts（M0 の書き出し用、M3 で廃止）, clamp01.ts, ctx.ts
                                    # ← DOM 非依存（Canvas の型のみ）
    **media/**                      # importImage.ts, importVideo.ts, limits.ts, errors.ts
    **preview/**                    # PreviewPlayer.ts（rAF クロック + <video> プール）
    **export/**                     # exportVideo.ts（main thread）, frameSource.ts, codec.ts, naming.ts, share.ts
    **storage/**                    # db.ts（idb-keyval）, projectRepo.ts
    **state/**                      # store.ts（zustand、フラットな 1 ストア）, persistence.ts
    capability/detect.ts            # 端末能力の表示（補助。成立の証明ではない）
```

依存の方向: `model → timeline → render → (preview | export)`。`render/` と `timeline/` は React・DOM・IndexedDB を import しない。

## 2. データモデルと時間の規則（`src/model/types.ts`、`src/timeline/`）

### 2.1 時間は整数フレームで持つ

内部時間はすべて **フレーム番号（整数）** で扱う。秒は UI の表示と入力のときだけ変換する。
これにより「3 等分が 0.1 秒刻みで割り切れない」「浮動小数のドリフト」を避ける（Codex 指摘 3）。

```ts
interface GroupPreset {
  id: string
  name: string
  aspect: '16:9' | '9:16'
  width: number
  height: number // 1080x1920 または 1920x1080（v1 はこの 2 つ）
  fps: 30 // v1 は 30 固定
  totalFrames: number // 既定 300（10 秒）。許容 150〜900（5〜30 秒）
}

interface Project {
  id: string
  schemaVersion: 1
  preset: GroupPreset // スナップショット
  locked: boolean
  meta: { memberName: string; spot: string }
  items: MediaItem[]
  createdAt: string
  updatedAt: string
}

type MediaItem = PhotoItem | VideoItem
interface ItemBase {
  itemId: string
  kind: 'photo' | 'video' // タイムラインの区間（Segment）と同じ名前で参照する
  blobKey: string
  thumbKey: string
  fileName: string
  width: number
  height: number // 回転適用後の表示サイズ
  durationFrames: number // タイムライン上の尺。合計 = totalFrames が不変条件
  caption?: Caption
  transitionOut?: Transition // 次の素材へのつなぎ。最後の素材では無視する
}
interface PhotoItem extends ItemBase {
  kind: 'photo'
  kenBurns: KenBurns
}
interface VideoItem extends ItemBase {
  kind: 'video'
  sourceDurationFrames: number // 元動画の尺（出力 fps 換算）
  trimStartFrames: number // 元動画のどこから使うか
}

interface KenBurns {
  presetId: 'none' | 'zoomIn' | 'zoomOut' | 'panLR' | 'panRL'
  from: { cx: number; cy: number; zoom: number } // cx, cy は 0..1、zoom は cover 比（1 = 画面いっぱい）
  to: { cx: number; cy: number; zoom: number }
}

interface Caption {
  text: string
  presetId: 'band' | 'outline' | 'box'
  position: 'top' | 'middle' | 'bottom'
  size: 'L' | 'M' | 'S'
  overrides?: { textColor?: string; bgColor?: string; fontId?: string }
  inOffsetFrames: number
  outOffsetFrames: number // コア区間基準の開始遅れ / 終了早め
}

interface Transition {
  type: 'cut' | 'crossfade'
  durationFrames: number
} // v1
```

### 2.2 尺の配分（`timeline/durations.ts`）

- `MIN_ITEM_FRAMES = 30`（1 秒）。`MAX_ITEMS = floor(totalFrames / MIN_ITEM_FRAMES)`（10 秒なら 10 個）。
  上限を超える追加は UI で拒否する。
- `equalSplit(n, totalFrames)`: `floor(total / n)` を全員に、余りを先頭から 1 フレームずつ配る。合計は常に `totalFrames`。
- `adjustDurations(durations, index, newFrames)`: 尺の数値配列を受け取り、対象を `newFrames` にして差分を他の素材へ
  比例配分する（ADR 013: timeline/ の関数は素材ではなく必要な値だけを受け取る）。比例配分で最小尺を下回る素材は最小尺で
  止め、残りの差分をさらに他へ回す。全員が最小尺なら変更を拒否して元の値を返す。元の尺や index が不正なときも元の値。
- `checkDurations(durations, totalFrames)` / `checkTimeline(items, totalFrames)`: 不変条件（合計、最小尺、整数、ID の一意性、
  トランジション上限、キャプションの最低表示長）を確かめて問題を文で返す。状態を変えた側はこれで確認する。
- 素材が 1 つのときは尺を変更できない（常に `totalFrames`）。素材が 0 のときはタイムラインは空。
- **素材の追加・削除では均等割りをやり直す**（v1 の割り切り。手動調整した尺は失われる）。「写真を全部入れてから尺を調整する」流れを想定。
  調整を保つ配分は、必要になったら後の章で足す。
- 尺を変えたあとは、隣接するトランジション長を `min(d, floor(min(前, 後) / 2))` に切り詰め、キャプションのオフセットも
  コア区間に収まるよう切り詰める（`clampAfterResize`）。キャプションは最低 `MIN_CAPTION_FRAMES = 16`（フェード 8 × 2）を
  表示に残す。末尾素材の `transitionOut` は消さずに残す（compile が無視する）。cut の長さは 0 に揃える。

### 2.3 区間の計算（`timeline/compile.ts`）

`compileTimeline(items)` が各素材について次を返す（`items` は `TimelineItem[]`。`MediaItem` はこれを含む）。すべてフレーム番号。
`itemsAt(compiled, frame)` でそのフレームに見える 0〜2 素材、`transitionAt(compiled, frame)` で種類と進行度を取る。

- `coreStart`, `coreEnd`: 均等割りの区間。`coreEnd = coreStart + durationFrames`（末尾は含まない）。
- `visibleStart = coreStart − floor(dIn / 2)`、`visibleEnd = coreEnd + ceil(dOut / 2)`。
  `dIn` は前の素材の `transitionOut`、`dOut` は自分の `transitionOut`。先頭素材の `dIn` と末尾素材の `dOut` は 0。
  制約: `d ≤ floor(min(前の尺, 後の尺) / 2)`。
- **素材内時刻の規則**（Codex 指摘 2）: 素材が画面に見え始めた瞬間を素材内の開始点とする。
  - 動画: `sourceFrame = trimStartFrames + (t − visibleStart)`。必要な元動画の長さは `visibleEnd − visibleStart`。
    足りない分は末尾フレームをホールドする。トリム UI の上限は `sourceDurationFrames − (visibleEnd − visibleStart)`。
  - Ken Burns: 進行度 `p = (t − visibleStart) / (visibleEnd − visibleStart − 1)`。
  - キャプション: 表示区間は `coreStart + inOffsetFrames` から `coreEnd − outOffsetFrames`。フェードは 8 フレーム固定。
- トランジション区間 `[coreEnd − floor(d/2), coreEnd + ceil(d/2))` では 2 つの素材が同時に見える。
  crossfade の進行度は `q = (t − 区間開始) / d`。

### 2.4 検証（`model/validate.ts`）

プリセットリンク（§6）と保存データ（§5）は同じ関数で検証する。許容値: `aspect` は 2 種、`width/height` はそれに対応する
1 組、`fps` は 30、`totalFrames` は 150〜900。範囲外は既定値に置き換えず、エラーとして表示する。

## 3. レンダリング（`src/render/`、`src/export/frameSource.ts`）

### 3.1 2 段階にする: 非同期で準備、同期で描画

デコードは非同期、Canvas 描画は同期なので、1 フレームごとに次の順序で進める（Codex 指摘 4）。

```ts
// 1 出力フレームの処理
await frameSource.prepare(t) // t で必要な素材のフレームを用意する（デコードを待つ）
renderFrame(timeline, t, ctx, frameSource) // 同期。frameSource.get(itemId) は必ず画像を返す
await encoder.add(t) // export のときだけ
frameSource.release(t) // t より前にしか使わないフレームを close する
```

- `prepare(t)` が用意できないとき（デコード失敗、ファイル破損）は例外を投げ、書き出しは失敗として止める。
  黒フレームを黙って出力しない。
- `FrameSource` が `VideoSample` の所有者。`close()` は `release()` だけが呼ぶ。
- 動画フレームの選択: `sample.timestamp ≤ 目標時刻 < sample.timestamp + sample.duration` を満たすサンプル。
  可変フレームレート（VFR）と開始時刻が 0 でないファイルに対応するため、`trimStartFrames` は秒に変換してから
  `samples(startSec)` に渡す。EOF 以降は最後のサンプルをホールド。
- 同時に開くデコーダは最大 2（トランジション中の前後）。素材の `visibleEnd` を過ぎたら破棄。

### 3.2 `renderFrame` は決定論的

```ts
renderFrame(compiled: CompiledItem[], items: RenderItem[], frame: number,
            ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
            images: { get(itemId: string): { image: CanvasImageSource; width: number; height: number } }): void
```

`images.get` は画像と **その画素寸法** を返す。切り出し矩形はこの寸法から計算する（`MediaItem.width/height` ではない）。
書き出しの動画は `CanvasSink` が出力サイズに cover 済みのキャンバスを返すので、寸法 = 出力サイズとなり、そのまま描かれる。

- `t` で見える素材（0〜2 個）を求め、素材を描く → crossfade 合成 → キャプションの順。
- 座標は正規化座標 × canvas サイズで解像度非依存。プレビュー（縮小キャンバス）と export（出力解像度）で同じ関数を使う。
- **crossfade の合成式**: 前の素材を `globalAlpha = 1` で描き、その上に次の素材を `globalAlpha = q` で描く（source-over）。
  両方を減衰させない。同じ画像同士を合成しても輝度が変わらないことをテストで確認する（Codex 指摘 8）。
- **キャプションは合成後に別描画**する。素材のフェードに巻き込まれない。
- Ken Burns は `from/to` を easeInOut で補間してソース矩形を算出 → `drawImage(src, sx, sy, sw, sh, 0, 0, W, H)`。
  パンのプリセットの振れ幅は zoom で空く余白（`(1 − 1/zoom) / 2`）ちょうどにする。それより大きいと、出力と同じ縦横比の写真で端に当たって止まる。
- テロップは `measureText` による書記素単位の折り返し（`caption.ts` の `wrapText`、日本語と絵文字対応）、幅 90%、上下セーフマージン 8%、
  収まらない行は切り捨てて `overflow` で知らせる（文字サイズは変えない）。
  サイズ L/M/S = 高さの 7.5 / 6 / 4.5%。
- **回転は mediabunny に任せ、アプリ側では回転しない**。写真は `createImageBitmap` の EXIF 適用、動画は `CanvasSink`
  （回転メタデータを自動適用）を使う。二重適用を防ぐため、`VideoItem.width/height` は回転後の値で保存する。

### 3.3 プレビュー

- 動画は `HTMLVideoElement`（`muted`、`playsInline`、Blob URL）。保持は現在と次の素材のみ（≤ 2）。
  再生時は `visibleStart` で `currentTime = trimStart 秒` → `play()`。100ms 超のドリフトで再同期。
- 写真は import 時に作った `ImageBitmap`。
- プレビューと export の数フレーム差は許容する。export の正しさは出力フレームの内容検証（§11）で確認する。

## 4. 書き出し（`src/export/`）

### 4.1 v1 の範囲

- **main thread だけ**で実行する。Worker 化は後の章（M6）。
- **H.264 / MP4 のみ**。コーデック文字列は `avc1.42E01F`（Constrained Baseline, Level 3.1）を 1080x1920 / 30fps で
  試し、ダメなら `avc1.42E028`（Level 4.0）。判定は `canEncodeVideo` に **実際の幅・高さ・fps・ビットレート** を渡して行う。
  どちらも不可なら「この端末では書き出せません」と止める。WebM へは切り替えない（Codex 指摘 6）。
- ビットレート 8 Mbps、`keyFrameInterval` 1 秒、`latencyMode: 'quality'`。
- 出力は `BufferTarget`（メモリ上、10 秒で約 10 MB）。

### 4.2 ループと進捗

```ts
for (let t = 0; t < totalFrames; t++) {
  if (cancelled) break
  await frameSource.prepare(t)
  renderFrame(tl, t, ctx, frameSource)
  await canvasSource.add(t / fps, 1 / fps)
  frameSource.release(t)
  if (t % 10 === 0) report(t, totalFrames)
}
```

- キャンセルはフラグ。次のフレームで止めて `output.cancel()` し、すべての `VideoSample`、`ImageBitmap`、デコーダを解放する。
- 失敗時も同じ解放処理を通す（`finally`）。
- 画面ロックやバックグラウンド移行で `visibilitychange` が hidden になったら書き出しを中断し、「もう一度書き出す」を表示する。
  main thread では途中再開しない。

### 4.3 入力の上限（`media/limits.ts`）

メモリの安全予算は端末ごとに違うので、入力側で上限を設ける（Codex 指摘 5）。

| 項目         | 上限                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 素材数       | `MAX_ITEMS`（10 秒なら 10）                                                                                                                                                          |
| 写真         | import 時に長辺 ≤ 出力の長辺 × 2（1080x1920 なら 3840）へ縮小し、縮小後だけ保存。原本は保持しない。`createImageBitmap(file, { resizeWidth, resizeHeight })` を使い、全面展開を避ける |
| 動画         | 解像度 ≤ 3840x2160、ファイル ≤ 200 MB。超えたら取り込みを拒否して案内する。取り込み時にまるごとメモリへ読む（ADR 012）                                                               |
| 同時デコーダ | 2                                                                                                                                                                                    |

### 4.4 保存と共有（`export/share.ts`）

- 書き出し完了後、「共有（写真に保存）」ボタンを表示する。共有はボタン押下の中で `navigator.share({ files })` を呼ぶ。
  完了後の自動呼び出しはしない（ユーザー操作が必要なため）。
- `AbortError` はキャンセル（何もしない）、それ以外は失敗として「ダウンロード」の副手段を案内する。
- 「ダウンロード」は `<a download>` + Blob URL。
- ファイル名: `${preset.name}_${memberName}_${spot}_${yyyymmdd}.mp4`。禁止文字は `_` に置換、空欄は `member` / `spot`。

## 5. 状態管理と永続化

- **zustand** のフラットな 1 ストア。`project`、`ui`（screen, selectedItemId, playheadFrame, isPlaying）、`saveStatus`、`exportJob`。
- **idb-keyval**（`createStore('gvlog', 'kv')`）。キー: `project:<id>`（JSON）、`blob:<key>`（File/Blob）、`thumb:<key>`、`index`。
- **保存の順序**（Codex 指摘 7）:
  1. Blob は import の中で先に保存する。保存に失敗したら素材を追加しない。
  2. プロジェクト JSON と `index` は `setMany` で 1 回の書き込みにまとめる。
  3. 未参照 Blob の削除は、JSON の保存が成功した **あと** に行う。
- 保存状態は `saveStatus: 'saving' | 'saved' | 'error'` を画面に表示する。保証するのは「saved と表示された状態からの復元」。
- JSON の保存は変更から 500ms デバウンス。容量不足や書き込み失敗は `error` にして案内する。
- 起動時に `navigator.storage.persist()` を要求する（保証にはならないので表示は変えない）。
- 複数タブの同時編集は v1 では扱わない（`BroadcastChannel` で「他のタブで開いています」と表示するのは M6）。

## 6. グループプリセットの配布

**URL ハッシュによるプリセットリンク**を採用（リポジトリ内プリセットは既定値のみ）。
`https://<user>.github.io/gvlog/#p=v1&name=Trip2026&ar=9x16&dur=10&res=1080`
リーダーがアプリ内「プリセットリンクを作る」で生成し LINE 等で共有。開いた側は固定モードで新規プロジェクトが
作られ、プリセットはスナップショットとして Project に保存される。値は §2.4 の検証を通す。fps は v1 では含めない（30 固定）。

## 7. モバイル UX

フロー（下部ステッパーで行き来）: **Home**（続きから / リンクから新規 / 名前・スポット入力）→
**Media**（`<input multiple accept="image/*,video/*">`、サムネイル一覧、▲▼並べ替え、尺スライダー）→
**Edit**（Ken Burns チップ、動画は開始位置スライダー、トランジション、キャプション編集）→
**Preview**（キャンバス、再生 / 一時停止、シーク）→ **Export**（進捗、共有 / ダウンロード）。
タッチ: 44px 以上のつまみ、チップ選択、ボトムシート。シークと尺調整の操作感は M3 で一度確認し、M5 まで放置しない。

**v1 に含めない:** 音声、複数キャプション / 自由配置、フォントアップロード、ステッカー・フィルタ、速度変更、
contain＋ぼかし背景、fade / slide / zoom トランジション、Worker 書き出し、Android での HEIC、WASM デコーダ、
PWA オフライン、ドラッグ並べ替え、複数タブ対応、60fps / 24fps。

## 8. 段階的ロードマップ

**M0 は縦割りの成立検証**にする（Codex 指摘 1）。能力一覧の表示ではなく、実素材で無音 MP4 を完成させて
CapCut に入るところまでを最初に通す。ここで通らなければ技術選定をやり直す。

|                       | 成果物                                                                                                                                                                                                                                            | 検証（完了条件）                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 成立検証**       | Vite+React+TS 雛形、`plugin-basic-ssl` で LAN HTTPS、Pages デプロイ、最小 UI（ファイル選択→書き出し→共有ボタン）。写真 1 枚 + iPhone の縦 HEVC 動画 1 本を cut でつなぎ、1080x1920 / 30fps / 10 秒 / 無音の MP4 を出す。回転と HDR の素材を含める | iPhone（推奨 OS と最低 OS の 2 台）、Android、PC Chrome で書き出し成功。写真アプリとギャラリーに保存。CapCut に読み込み。`ffprobe` と冒頭・境界・末尾フレームの画像確認。結果を `docs/support-matrix.md` に記録。mediabunny 採用を ADR で確定 |
| **M1 タイムライン**   | `model/`、`timeline/`（整数フレーム、均等割り、再配分、区間計算、切り詰め）、`validate.ts`                                                                                                                                                        | Vitest（テストファースト）。端数、上限、全員最小尺、1 素材、0 素材、トランジション切り詰め                                                                                                                                                    |
| **M2 写真と描画**     | `render/`（Ken Burns、crossfade 合成式、キャプション 1 書体、折り返し）、プレビュー再生、写真 import の縮小と上限                                                                                                                                 | Vitest（計算部）＋ `@napi-rs/canvas` で合成式と座標の検証。3 端末で 10 秒再生                                                                                                                                                                 |
| **M3 動画と書き出し** | `FrameSource`（prepare / get / release）、トリム UI、キャンセル、中断処理、共有・ダウンロード                                                                                                                                                     | iPhone HEVC 縦 / Android H.264 / 2 分超の動画。出力フレーム内容の検証。シークと尺調整の操作感を確認                                                                                                                                           |
| **M4 保存と配布**     | 保存順序、saveStatus、復元、プロジェクト一覧、プリセットリンクと検証                                                                                                                                                                              | iPhone でタブ強制終了 → 復元。容量不足の模擬。リンクの不正値でエラー表示                                                                                                                                                                      |
| **M5 仕上げ**         | フォント 2〜3 書体、キャプションプリセット、エラーメッセージ、UI の見た目調整、README                                                                                                                                                             | 3 名でエンドツーエンド。Playwright スモーク（desktop Chrome）                                                                                                                                                                                 |
| **M6（後の章）**      | Worker 書き出し、fade / slide トランジション、複数タブ検知、PWA、ドラッグ並べ替え                                                                                                                                                                 | —                                                                                                                                                                                                                                             |

各マイルストーンの完了時に git タグ（`m0` ...）を打つ。

## 9. リスクと対策

- **実素材が通らない**: M0 で最初に確認する。通らなければ mediabunny の `CustomVideoDecoder` / 別ライブラリ / 対応端末の絞り込みを検討。
- **iOS メモリ**: §4.3 の入力上限、必要な分だけ展開、失敗・キャンセル時の一括解放。低メモリ端末で 3 回連続の書き出しを M3 で確認。
- **Android の HEVC**: import 時に `track.canDecode()` で判定し「この端末では読み込めません」を表示。さらに M0 で実機確認。
- **向き**: 回転は mediabunny に一任（§3.2）。M0 で縦撮り素材を確認。
- **HDR 入力**（iPhone 既定の HLG / Dolby Vision）: M0 で色を確認する。崩れる場合は、トラックの色情報（`colorSpace`）で
  HDR を検知し「HDR 動画は読み込めません。iPhone の設定で HDR ビデオをオフにして撮り直してください」と取り込みを拒否する。
  黙って色が変わった出力は出さない。
- **フォント**: Worker を使わないので `document.fonts.load()` の完了を待ってから描画する。1 書体を pyftsubset で JIS 第 1・2 水準に絞る。
- **Safari の IDB 7 日消去（ITP）**: README で「書き出しは当日中に」と案内。
- **H.264 非対応端末**: 書き出し前に判定して止める。対応表に載せない。
- **secure context**: 実機検証は HTTPS で行う。`plugin-basic-ssl` の自己署名証明書を iPhone / Android で「このまま開く」を選ぶ。
  本番確認は GitHub Pages。

## 10. 主要依存

| パッケージ                                                                                                             | 役割                                             | gzip 目安                   |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------- |
| react / react-dom                                                                                                      | UI                                               | ~45KB                       |
| mediabunny                                                                                                             | mux / demux / デコード / エンコード（M0 で確定） | ~60〜100KB（tree-shake 後） |
| zustand                                                                                                                | 状態                                             | ~1KB                        |
| idb-keyval                                                                                                             | IndexedDB                                        | ~0.6KB                      |
| tailwindcss v4、shadcn/ui                                                                                              | UI 部品                                          | 使った分だけ                |
| vite, @vitejs/plugin-react, @vitejs/plugin-basic-ssl, typescript, oxlint（ADR 011）, prettier, vitest, @napi-rs/canvas | dev                                              | —                           |
| playwright                                                                                                             | ブラウザ結合テスト（desktop Chrome）             | dev                         |

## 11. テスト方針（TDD）

純粋ロジックはテストファースト、ブラウザ依存部分はブラウザ結合テストと実機で確認する。モックで安心しない（Codex 指摘 10）。

| 層                                                                                            | 方針                                                                                                                                       | 手段                                                          |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `timeline/`（均等割り、端数、再配分、上限、区間、切り詰め）                                   | **TDD 必須**                                                                                                                               | Vitest                                                        |
| `render/` の計算部（Ken Burns 矩形、進行度、折り返し、位置・サイズ）                          | **TDD 必須**                                                                                                                               | Vitest                                                        |
| `render/` の合成（crossfade 式、キャプションが合成後に描かれること）                          | テストは書く。同色合成で輝度不変、境界フレームの色をサンプリング                                                                           | Vitest + `@napi-rs/canvas`（Safari の描画の証明にはならない） |
| `model/validate.ts`、`export/naming.ts`、`state/` の更新（合計尺の不変条件、saveStatus 遷移） | TDD                                                                                                                                        | Vitest                                                        |
| `export/` のループ・進捗・キャンセル・解放                                                    | `FrameSource` と encoder のフェイクでテスト。release が必ず呼ばれること                                                                    | Vitest                                                        |
| 保存失敗、キャンセル、短い実動画の書き出し                                                    | **ブラウザ結合テスト**                                                                                                                     | Playwright（desktop Chrome）                                  |
| 出力 MP4                                                                                      | 属性（`ffprobe`: h264 / 解像度 / 30fps / 尺 / 音声なし）に加え、**冒頭・境界・末尾のフレームを `ffmpeg` で画像に取り出し、期待色と比べる** | スクリプト `scripts/verify-output.sh`                         |
| iPhone / Android 実機                                                                         | 対応を約束する端末は手動実機試験を必須にする                                                                                               | `docs/testing-checklist.md`                                   |

運用ルール:

- 新しい純粋関数を書くときは、先に `*.test.ts` で期待値を書いてから実装する。
- ブラウザ API に触るモジュールは、呼び出し側が依存する最小の interface を先に定義し、テストではフェイクを使う。
- テスト名は日本語の文にする。

## 12. UI の進め方と UI フレームワーク

ロジック（timeline / render / export）をテストファーストで固め、UI は機能確認できる最小構成で組む。見た目の調整は M5。
ただしシークと尺調整の操作感は M3 で確認する。

UI フレームワークは Tailwind CSS v4 ＋ shadcn/ui（ADR 007）。

## 13. 教科書化の方針

**想定読者**: プログラミング経験者で、TypeScript と Tailwind CSS は初心者。AI を使った開発を本格的に習得したい人。

**方針**

- 構成・コーディング・進め方は標準的で平易なものを選ぶ。賢い型技巧、二重経路、暗黙の規約を避ける。
- 型は「読めば分かる」範囲に留める（ジェネリクスの多用、条件型、型レベル計算は使わない）。
- **v1 は 1 本道**: main thread、H.264 / MP4、30fps、1 書体、cut と crossfade、基本テロップ、フラットなストア。
  Worker、他のトランジション、複数書体、複数タブは後の章で足す。§1〜8 はこの範囲で書いてある。
- 予告した全モジュールを最初から作らない。各マイルストーンで必要なものだけ作る。

**記録の仕組み**

- `docs/devlog/YYYY-MM-DD.md`: セッションごとに 10 行程度。AI が下書きし、人間が一言足す。5 分まで。
- `docs/adr/NNN-title.md`: 設計判断。決定時のみ。
- `docs/reviews/YYYY-MM-DD-<topic>.md`: レビュー記録（§14）。
- `docs/support-matrix.md`: M0 以降、実機で成功した条件だけを載せる対応表。
- マイルストーンごとに git タグ。コミットメッセージは「何を、なぜ」を日本語 1〜2 行。テスト名は日本語の文。
- 迷った跡も残す。AI の誤りも残す。

## 14. レビュー体制（Claude ＋ Codex）

**目的**: 堅牢なコードにすることと、「複数の AI でレビューする」手順を教材にすること。儀式を重くしない（Codex 指摘 12）。

**使う仕組み**: gstack の `/codex`（Codex CLI、モデル gpt-6-astra、read-only サンドボックス）。
sdd-kit の `/sdd-kit:codex` はレビューに使わない。

| モード    | コマンド                  | 用途                                                 |
| --------- | ------------------------- | ---------------------------------------------------- |
| Review    | `/codex review`           | base ブランチとの差分を独立レビューし、合否を出す    |
| Challenge | `/codex challenge <焦点>` | 差分を「壊す」視点で攻める                           |
| Consult   | `/codex <質問>`           | プランや設計への意見。セッション継続で追加質問できる |

**全 PR に必須**: `npm run lint`、`npm run typecheck`、`npm test`。純粋関数の変更はテストを伴うこと。

**重要な変更に必須**（`timeline/`、`render/`、`export/`、`storage/`、`model/validate.ts` の変更、または 100 行超の差分）:

1. Claude の `/code-review` → 指摘を直す。
2. Codex の `/codex review` → 指摘を直す。`timeline/` と `export/` は `/codex challenge` も行う。
3. **修正後の最終差分**で再度 lint / typecheck / test を通す。重要指摘が残っていれば再レビュー。
4. 人間が判断し、記録する。

**UI だけの変更**: 全 PR 必須の項目のみ。AI レビューは任意。

**マージを止める条件**: 未解決の Critical 指摘がある。必須の実機試験（`testing-checklist.md` の該当項目）が未実施。

**初回レビュー**: M0 完了時は比較先がないため、`/codex review` ではなく Consult モードで主要ファイルを埋め込んで全体レビューする。

**記録（`docs/reviews/YYYY-MM-DD-<topic>.md`）**: 対象ブランチと最終コミット SHA、Claude と Codex の重要指摘（Critical / Warning）、
人間の判断（採用 / 不採用と理由、食い違い）、修正後の検証結果、学び。Info 級の指摘や原文の全文は残さなくてよい
（プランレビューなど節目のものは全文を残す）。

**注意点**

- レビューはテストの代わりにならない。
- 2 つの AI が同じ誤りに同意することはある。実機確認を省かない。
- Codex Review は差分あたり数分かかる。差分は 300 行程度に保つ。
- Codex の Web 検索は失敗することがある（2026-10-08 に接続タイムアウトを確認）。ブラウザ対応の事実は Codex の断定を鵜呑みにしない。

## 検証方法（全体）

1. `npm test`（Vitest）で `timeline/`、`render/`、`model/`、`export/` の純粋部分をテスト。
2. `npm run dev -- --host` を `plugin-basic-ssl` で HTTPS 化し、iPhone Safari・Android Chrome から実機確認。
3. `npm run build` → GitHub Pages デプロイ後、本番 URL でも確認。
4. 出力 MP4 を `scripts/verify-output.sh` で検証（`ffprobe` の属性 ＋ 冒頭・境界・末尾フレームの画像）。CapCut に読み込む。
5. Playwright（desktop Chrome）で保存失敗、キャンセル、短い動画の書き出しを結合テスト。

## 実装開始時の最初の作業（M0）

1. Vite の react-ts テンプレートで雛形作成。依存追加（mediabunny, zustand, idb-keyval, tailwindcss, vitest, @vitejs/plugin-basic-ssl）。
2. `vite.config.ts` に `base` と basic-ssl、`.github/workflows/deploy.yml` を作成。
3. 最小 UI: ファイル選択（写真 1 + 動画 1）→ 書き出しボタン → 進捗 → 共有 / ダウンロードボタン。
4. `export/exportVideo.ts` を main thread で実装。cut のみ、Ken Burns なし、キャプションなし。
5. iPhone の縦 HEVC 動画（HDR あり / なし）と写真で書き出し、`scripts/verify-output.sh` と CapCut で確認。
6. 結果を `docs/support-matrix.md` に記録し、mediabunny 採用の ADR を確定。初回コミットとタグ `m0`。
