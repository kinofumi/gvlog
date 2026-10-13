// 動画の開始位置（トリム）に関する計算（plan §2.3）。すべてフレーム番号。

/**
 * 出力の frame で、元動画のどのフレームを使うか。
 * 素材が画面に見え始めた瞬間（visibleStart）が trimStartFrames に当たる。
 */
export function sourceFrameAt(
  trimStartFrames: number,
  visibleStart: number,
  frame: number,
): number {
  return trimStartFrames + (frame - visibleStart)
}

/**
 * トリムの上限。元動画の尺から、見える長さ（visibleEnd − visibleStart）を引いた分だけ動かせる。
 * 元動画のほうが短ければ 0（足りない分は末尾フレームをホールドする）。
 */
export function maxTrimStart(sourceDurationFrames: number, visibleLength: number): number {
  return Math.max(0, sourceDurationFrames - visibleLength)
}

/** トリムを 0〜上限の整数に収める。非整数は切り捨て、NaN は 0 */
export function clampTrimStart(
  trimStartFrames: number,
  sourceDurationFrames: number,
  visibleLength: number,
): number {
  const value = Number.isNaN(trimStartFrames) ? 0 : Math.floor(trimStartFrames)
  return Math.max(0, Math.min(value, maxTrimStart(sourceDurationFrames, visibleLength)))
}
