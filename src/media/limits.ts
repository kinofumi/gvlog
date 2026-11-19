// 入力の上限。スマホのメモリは端末ごとに違い「安全予算」が読めないので、入力側で制限する。

/** 写真は出力の長辺 × 2 まで縮小してから使う（1080x1920 なら 3840） */
export const PHOTO_SCALE_FACTOR = 2

/** 動画の解像度上限（4K） */
export const VIDEO_MAX_WIDTH = 3840
export const VIDEO_MAX_HEIGHT = 2160

/**
 * 動画のファイルサイズ上限（200 MB）。
 * 動画は取り込み時にまるごとメモリへ読み込む（ADR 012）ので、この分がそのままメモリに載る。
 * 10 秒素材に使う動画は長くても数十 MB なので、200 MB あれば足りる。
 */
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024

/**
 * 編集タブで取り込む動画の長さの上限（30 秒）。
 * 1 本の尺は最長 15 秒（プリセット）なので、素材が 30 秒あれば足りる。
 * 長い動画は読み込み（まるごとメモリへ）とポスター作りに時間がかかり、「固まった」ように見える。
 * 「つなげる」タブには上限を付けない（各自が書き出した MP4 を集めるだけで、長さは出力側で決まる）。
 */
export const VIDEO_MAX_SEC = 30

/** 撮影アプリで「30 秒」で止めても 30.3 秒などの端数が付くので、この幅までは同じ長さとみなす */
export const VIDEO_LENGTH_TOLERANCE_SEC = 0.5

/** 動画が長すぎるか。`maxSec` が undefined なら上限なし */
export function isVideoTooLong(lengthSec: number, maxSec: number | undefined): boolean {
  if (maxSec === undefined) return false
  return lengthSec > maxSec + VIDEO_LENGTH_TOLERANCE_SEC
}
