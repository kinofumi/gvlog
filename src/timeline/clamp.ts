import type { CaptionTiming, TimelineItem } from '../model/types'

/** トランジション長の上限: 前後の短い方の尺の半分（切り捨て） */
export function clampTransition(
  durationFrames: number,
  prevFrames: number,
  nextFrames: number,
): number {
  const limit = Math.floor(Math.min(prevFrames, nextFrames) / 2)
  return Math.max(0, Math.min(toFrames(durationFrames), limit))
}

/** フレーム数として扱える整数にする。非整数は切り捨て、NaN は 0。Infinity はそのまま（上限で止まる） */
function toFrames(value: number): number {
  return Number.isNaN(value) ? 0 : Math.floor(value)
}

/** キャプションが見える最低の長さ。フェードイン・アウトが 8 フレームずつ（plan §2.3）なので、その合計 */
export const MIN_CAPTION_FRAMES = 16

/**
 * キャプションの開始遅れと終了早めを、素材の尺に収める。
 * 表示区間が MIN_CAPTION_FRAMES 以上残るようにする（尺がそれより短ければ全部を表示区間にする）。
 * 開始遅れを優先し、はみ出た分は終了早めから削る。
 */
export function clampCaptionOffsets(timing: CaptionTiming, durationFrames: number): CaptionTiming {
  const minShow = Math.min(MIN_CAPTION_FRAMES, durationFrames)
  const room = durationFrames - minShow
  const inOffsetFrames = Math.max(0, Math.min(toFrames(timing.inOffsetFrames), room))
  const outOffsetFrames = Math.max(
    0,
    Math.min(toFrames(timing.outOffsetFrames), room - inOffsetFrames),
  )
  return { inOffsetFrames, outOffsetFrames }
}

/**
 * 尺を変えたあとに、トランジション長とキャプションのオフセットを規則内に切り詰める。
 * 末尾の素材の transitionOut は触らない（無視するのは compile 側。あとで素材を足したときに生きる）。
 * cut の durationFrames は意味がないので 0 に揃える。
 * 入力は変更せず、新しい配列と要素を返す。
 * T を付けているのは、MediaItem の他のフィールドを落とさずに返すため。
 */
export function clampAfterResize<T extends TimelineItem>(items: T[]): T[] {
  return items.map((item, i) => {
    const next = { ...item }
    const following = items[i + 1]
    if (item.transitionOut && item.transitionOut.type === 'cut') {
      next.transitionOut = { ...item.transitionOut, durationFrames: 0 }
    } else if (item.transitionOut && following) {
      const durationFrames = clampTransition(
        item.transitionOut.durationFrames,
        item.durationFrames,
        following.durationFrames,
      )
      next.transitionOut = { ...item.transitionOut, durationFrames }
    }
    if (item.caption) {
      next.caption = { ...item.caption, ...clampCaptionOffsets(item.caption, item.durationFrames) }
    }
    return next
  })
}
