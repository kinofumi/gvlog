import type { VideoItem } from '../model/types'
import { maxTrimStart } from '../timeline/trim'

/**
 * 動画の開始位置（元動画のどこから使うか）。上限は元動画の尺 − 見える長さ（plan §2.3）。
 * 元動画が見える長さより短いときは動かせない（足りない分は末尾フレームをホールドする）。
 */
export function TrimEditor({
  item,
  visibleLength,
  fps,
  onChange,
}: {
  item: VideoItem
  /** この素材が画面に見えている長さ（トランジション込み、フレーム数） */
  visibleLength: number
  fps: number
  onChange: (trimStartFrames: number) => void
}) {
  const max = maxTrimStart(item.sourceDurationFrames, visibleLength)
  const sec = (frames: number) => (frames / fps).toFixed(1)
  return (
    <div className="space-y-1">
      <p className="text-sm">開始位置</p>
      <label className="flex items-center gap-2 text-xs">
        <input
          className="flex-1"
          type="range"
          min={0}
          max={max}
          step={1}
          value={item.trimStartFrames}
          disabled={max === 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="w-12 text-right tabular-nums">{sec(item.trimStartFrames)} 秒</span>
      </label>
      <p className="text-xs text-stone-500">
        元の動画 {sec(item.sourceDurationFrames)} 秒のうち、{sec(item.trimStartFrames)} 秒から{' '}
        {sec(item.trimStartFrames + visibleLength)} 秒までを使います。
        {max === 0 && '（元の動画が短いので、最後のフレームで止まります）'}
      </p>
    </div>
  )
}
