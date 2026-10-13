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
