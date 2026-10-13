import type { MediaItem } from '../model/types'
import { compileTimeline } from './compile'

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

/**
 * すべての動画の開始位置を上限内に切り詰める。尺やトランジションが変わると「見える長さ」が変わるので、
 * 素材を置き換えるたびに呼ぶ。変わらない素材は同じオブジェクトのまま返す。
 */
export function clampTrims(items: MediaItem[]): MediaItem[] {
  const compiled = compileTimeline(items)
  return items.map((item, i) => {
    if (item.kind !== 'video') return item
    const visibleLength = compiled[i].visibleEnd - compiled[i].visibleStart
    const trimStartFrames = clampTrimStart(
      item.trimStartFrames,
      item.sourceDurationFrames,
      visibleLength,
    )
    return trimStartFrames === item.trimStartFrames ? item : { ...item, trimStartFrames }
  })
}
