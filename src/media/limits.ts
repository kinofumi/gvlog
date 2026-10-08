// 入力の上限。スマホのメモリは端末ごとに違い「安全予算」が読めないので、入力側で制限する。

/** 写真は出力の長辺 × 2 まで縮小してから使う（1080x1920 なら 3840） */
export const PHOTO_SCALE_FACTOR = 2

/** 動画の解像度上限（4K） */
export const VIDEO_MAX_WIDTH = 3840
export const VIDEO_MAX_HEIGHT = 2160

/** 動画のファイルサイズ上限（500 MB） */
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024
