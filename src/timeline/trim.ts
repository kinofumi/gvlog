import type { MediaItem } from '../model/types'
import { compileTimeline } from './compile'
import { MIN_ITEM_FRAMES } from './durations'

// 動画の開始位置・終了位置（トリム）に関する計算（plan §2.3）。すべてフレーム番号。
// 保存するのは開始位置と尺だけで、終了位置は「開始位置 + 尺」から求める（終了位置を動かすと尺が変わる）。

/** 終了位置の計算に使う、動画素材の 3 つの値 */
export type TrimInput = {
  trimStartFrames: number
  durationFrames: number
  sourceDurationFrames: number
}

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

/**
 * 終了位置スライダーの範囲。下限は開始位置 + 最小尺。
 * 上限は元動画の末尾と「開始位置 + 尺の上限（maxDurationFrames）」の小さい方。
 * トランジションで見える長さが尺より延びる分（visibleLength − durationFrames）は末尾から引く。
 * 引かないと、末尾まで使ったときに見える長さが元動画を超え、clampTrims が開始位置を手前に戻してしまう。
 * 元動画が最小尺より短いときは max < min になる（呼び出し側はスライダーを無効にする）。
 */
export function trimEndRange(
  item: TrimInput,
  visibleLength: number,
  maxDurationFrames: number,
): { min: number; max: number } {
  const extra = Math.max(0, visibleLength - item.durationFrames)
  const min = item.trimStartFrames + MIN_ITEM_FRAMES
  const max = Math.min(item.sourceDurationFrames - extra, item.trimStartFrames + maxDurationFrames)
  return { min, max }
}
