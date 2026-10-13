import type { CaptionTiming, TimelineItem } from '../model/types'

/** トランジション長の上限: 前後の短い方の尺の半分（切り捨て） */
export function clampTransition(
  durationFrames: number,
  prevFrames: number,
  nextFrames: number,
): number {
  const limit = Math.floor(Math.min(prevFrames, nextFrames) / 2)
  return Math.max(0, Math.min(durationFrames, limit))
}

/** キャプションの開始遅れと終了早めを、素材の尺に収める。開始遅れを優先し、はみ出た分は終了早めから削る */
export function clampCaptionOffsets(timing: CaptionTiming, durationFrames: number): CaptionTiming {
  const inOffsetFrames = Math.max(0, Math.min(timing.inOffsetFrames, durationFrames))
  const outOffsetFrames = Math.max(
    0,
    Math.min(timing.outOffsetFrames, durationFrames - inOffsetFrames),
  )
  return { inOffsetFrames, outOffsetFrames }
}

/**
 * 尺を変えたあとに、トランジション長とキャプションのオフセットを規則内に切り詰める。
 * 入力は変更せず、新しい配列と要素を返す。
 * T を付けているのは、MediaItem の他のフィールドを落とさずに返すため。
 */
export function clampAfterResize<T extends TimelineItem>(items: T[]): T[] {
  return items.map((item, i) => {
    const next = { ...item }
    if (item.transitionOut) {
      const following = items[i + 1]
      const durationFrames = following
        ? clampTransition(
            item.transitionOut.durationFrames,
            item.durationFrames,
            following.durationFrames,
          )
        : 0
      next.transitionOut = { ...item.transitionOut, durationFrames }
    }
    if (item.caption) {
      next.caption = { ...item.caption, ...clampCaptionOffsets(item.caption, item.durationFrames) }
    }
    return next
  })
}
