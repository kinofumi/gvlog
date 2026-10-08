# M0 縦割り検証のレビュー（2026-10-08）

対象: ブランチ `m0-vertical-slice`、`main` との差分（実装 `468b4ec`、修正後のコミットは末尾に記載）。
範囲: Vite 雛形、`timeline/`、`render/`、`media/`、`export/`、`App.tsx`、デプロイ設定、検証スクリプト。

## 自己チェック
- `npm run typecheck`、`npm run lint`、`npm test`（13 件）すべて通過。
- ヘッドレス Chrome で写真 + H.264 動画の書き出しを確認（`docs/support-matrix.md`）。

## Claude の指摘（`/code-review main high`、9 件）
1. **Critical** `PhotoFrameSource.dispose()` が呼び出し側の所有する ImageBitmap を閉じるため、2 回目の書き出しが失敗する。
2. **Warning** 書き出し中もファイル選択が有効で、差し替えると使用中の Input / ビットマップを閉じてしまう。
3. **Warning** oxlint がプラン §10 と ADR に無い（CLAUDE.md の「外部ライブラリは表にあるものだけ」に反する）。
4. **Warning** `VideoFrameSource` の current / next のポンプは、mediabunny の `canvasesAtTimestamps()` で置き換えられる（約 60 行 → 約 20 行）。
5. **Warning** `importVideo` のエラー経路で `Input` を解放していない。
6. **Warning** `importImage` で縮小に失敗するとフルサイズのビットマップが閉じられない。
7. **Warning** `onPickPhoto` / `onPickVideo` が await の前に前の資源を閉じるため、読み込みが重なると違う資源を閉じる。
8. **Info** favicon の href に base が直書きされている。
9. **Info** `new Blob([buffer])` が出力をコピーし、一時的にメモリが 2 倍になる。

## 人間の判断
- 採用: 1〜8。
  - 1: `PhotoFrameSource.dispose()` を何もしない実装にし、「呼び出し側から受け取った資源は解放しない」を interface の規約に書いた。
  - 2: 取り込み中と書き出し中はファイル入力を `disabled` にした。
  - 3: ADR 011 を追加し、プラン §10 を oxlint に直した。
  - 4: `canvasesAtTimestamps()` に区間の時刻列を渡す形に書き直した。「時刻以下で最新のフレーム」と末尾ホールドはライブラリに任せる。
  - 5: `probe()` に分け、失敗時に `input.dispose()` してから投げ直す。
  - 6: `try / finally` で必ず `full.close()`。
  - 7: 前の資源は functional setState の中で閉じる。
  - 8: `href="/favicon.svg"` にして Vite に base を付けさせる（ビルド結果で確認）。
- 不採用: 9。10 秒 / 約 10MB では影響が小さく、`StreamTarget` への変更は Worker 化と同じ「後の章」で扱う。
- 修正後の確認: 13 件のテスト通過、ヘッドレス Chrome で 2 回連続の書き出しが成功（1.6 秒 / 1.5 秒）、出力の 5.0 秒と 6.0 秒のフレームが異なる（動画が進んでいる）。

## Codex の指摘（`/codex review`、修正後のコミット `6f30008` の差分）
注: `codex review --base main` は Codex 内部のコマンド実行がタイムアウトして差分を読めず、「未検証」で終わった。
gstack の代替経路（差分をプロンプトに埋め込んで `codex exec` で静的レビュー）で実施。Web 検索も不通。トークン 30,982。

1. **[P2] 非同期のデコーダ解放を待っていない** — `src/export/frameSource.ts:108`、`src/export/exportVideo.ts:128`  
   `void this.frames.return()` は解放処理の Promise を捨てています。デコーダの終了前に書き出しが完了扱いとなり、次の書き出しや素材の差し替えが始まります。解放時の rejection も未処理になります。  
   **修正:** `dispose()` を非同期にして `frames.return()` を待ち、書き出し側の `finally` でも解放完了を待ってください。解放失敗で元のエラーを隠さない処理も必要です。

2. **[P2] 動画の先頭時刻を常に 0 と仮定している** — `src/export/frameSource.ts:81–82`  
   先頭フレームの表示時刻が正の値になっている素材では、最初の要求時刻 `0` に対応する画像がなく、`prepare()` が失敗する可能性があります。MP4/MOV のタイムスタンプが必ず 0 始まりとは限りません。  
   **修正:** 最初の表示フレームのタイムスタンプを取得し、それを基準に `trimStartSec + 区間内の経過時間` を加算してください。先頭時刻が 0 でない素材も検証対象に含めます。

3. **[P2] 透過画像がフレームごとに重ね塗りされる** — `src/render/renderFrame.ts:18`  
   キャンバスを初期化せず `drawImage()` を繰り返すため、半透明 PNG は描画のたびに不透明になります。静止画なのに書き出し冒頭で見た目が変化します。  
   **修正:** 毎フレーム、描画前にキャンバス全体を黒などの固定背景色で塗りつぶしてください。H.264 出力での透明部分の色も確定できます。

4. **[P2] 最終フレーム以降のキャンセルが無視される** — `src/export/exportVideo.ts:107–115`  
   中断確認がループ先頭にしかありません。最後の `canvasSource.add()` や `output.finalize()` を待っている間にキャンセルしても、正常完了としてファイルが表示されます。  
   **修正:** エンコード待機後、`finalize()` の前後にも中断確認を入れてください。少なくとも中断済みの処理から成功結果を返さないようにします。

5. **[P2] 画面が所有する素材にアンマウント時の解放がない** — `src/App.tsx:23–44`  
   `ImageBitmap` と `Input` は差し替え時にしか解放されません。App のアンマウント時には現在の素材が残り、取り込みや書き出しも継続します。取り込み完了がアンマウント後になった場合も、返された資源の解放先がありません。  
   **修正:** 所有資源と処理中のタスクを管理し、アンマウント時には書き出しを中断して終了後に素材を解放してください。遅れて完了した取り込み結果も、その場で解放する必要があります。

通常ループの `prepare → draw → await encode` の順序は適切です。提示差分のみを静的レビューし、コマンド・テストは実行していません。外部仕様の照合は接続タイムアウトのため、Safari 16.4 および mediabunny の実動作は未検証です。

ゲート: PASS（P1 なし、P2 が 5 件）

## 人間の判断（Codex 分）
- 採用: 1（`dispose()` を非同期にして解放を待つ）、2（`getFirstTimestamp()` を取り、動画の先頭時刻を基準にする）、
  3（毎フレーム黒で塗ってから描く）、4（ループ後・`finalize()` 前にもキャンセルを確認）。
- 不採用: 5（App のアンマウント時解放）。App はルートで常駐し、画面遷移で外れることがないため v1 では不要。
  画面を分けるとき（M2 以降）に再検討する。
- 修正後の確認: typecheck / lint / 13 件のテスト通過。ヘッドレス Chrome で書き出し成功、出力の属性を再確認。

## 2 者の比較
- 両方が指摘: 資源解放（Claude は所有権と失敗経路、Codex は非同期解放の待ち合わせ）。
- Claude だけ: 2 回目の書き出し失敗（Critical）、入力の無効化、`canvasesAtTimestamps` への単純化、favicon、oxlint の記録漏れ。
- Codex だけ: 動画の先頭時刻が 0 でない場合、透過 PNG の重ね塗り、最終フレーム後のキャンセル。
- 重なりは 1 件のみ。観点が違うので二重レビューの価値はあった。

## 学び（教科書向けメモ）
- 「誰が資源を閉じるか」を interface の規約として書いておかないと、便利な `dispose()` が持ち主の資源まで閉じてしまう。
- 自前のイテレータ制御は、ライブラリが同じことをやっていないか先に探す（CLAUDE.md の reuse ladder）。
