import { outputFramesOf } from '../state/projectActions'
import { useAppStore } from '../state/store'
import { overflowFrames, sumFrames } from '../timeline/durations'

/**
 * 尺の合計と上限。合計が上限を超えていたら赤い注意にする（ADR 015）。
 * 超えた分は出力で切り捨てられるので、素材一覧と「動画を生成」の両方の近くに置く。
 */
export function TotalDuration() {
  const items = useAppStore((s) => s.project.items)
  const preset = useAppStore((s) => s.project.preset)
  const durations = items.map((i) => i.durationFrames)
  const total = sumFrames(durations)
  const overflow = overflowFrames(durations, preset.maxFrames)
  const sec = (frames: number) => (frames / preset.fps).toFixed(1)
  if (overflow > 0) {
    return (
      <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        合計 {sec(total)} 秒。上限の {sec(preset.maxFrames)} 秒を超えた末尾 {sec(overflow)}{' '}
        秒は、生成する動画に入りません。コマの尺を短くしてください。
      </p>
    )
  }
  return (
    <p className="text-sm text-stone-600">
      合計 {sec(total)} 秒（上限 {sec(preset.maxFrames)} 秒）。生成する動画は{' '}
      {sec(outputFramesOf(useAppStore.getState().project))} 秒です。
    </p>
  )
}
