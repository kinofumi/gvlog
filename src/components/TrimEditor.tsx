import type { VideoItem } from '../model/types'
import { maxTrimStart, trimEndFrames, trimEndRange } from '../timeline/trim'

/**
 * 動画のどこを使うか（plan §2.3）。
 * - 開始位置: 使う範囲を尺のまま前後に動かす。上限は元動画の尺 − 見える長さ。
 * - 終了位置: 開始位置は変えず、この素材の尺を「終了位置 − 開始位置」にする。差分は他の素材が受け取る。
 * 元動画が見える長さより短いときは動かせず、足りない分は末尾フレームをホールドする。
 */
export function TrimEditor({
  item,
  visibleLength,
  maxDurationFrames,
  canChangeDuration,
  fps,
  disabled,
  onChangeStart,
  onChangeEnd,
}: {
  item: VideoItem
  /** この素材が画面に見えている長さ（トランジション込み、フレーム数） */
  visibleLength: number
  /** この素材が取れる尺の上限（他の素材が全員最小尺のときの残り） */
  maxDurationFrames: number
  /** 尺を変えられるか（素材が 1 つのときは総尺で固定なので変えられない） */
  canChangeDuration: boolean
  fps: number
  disabled?: boolean
  onChangeStart: (trimStartFrames: number) => void
  onChangeEnd: (trimEndFrames: number) => void
}) {
  const maxStart = maxTrimStart(item.sourceDurationFrames, visibleLength)
  const end = trimEndFrames(item)
  const endRange = trimEndRange(item, visibleLength, maxDurationFrames)
  const endDisabled = disabled || !canChangeDuration || endRange.max < endRange.min
  const sec = (frames: number) => (frames / fps).toFixed(1)
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm">開始位置</p>
        <label className="flex items-center gap-2 text-xs">
          <input
            className="flex-1"
            type="range"
            min={0}
            max={maxStart}
            step={1}
            value={item.trimStartFrames}
            disabled={maxStart === 0 || disabled}
            onChange={(e) => onChangeStart(Number(e.target.value))}
          />
          <span className="w-12 text-right tabular-nums">{sec(item.trimStartFrames)} 秒</span>
        </label>
      </div>
      <div className="space-y-1">
        <p className="text-sm">終了位置</p>
        <label className="flex items-center gap-2 text-xs">
          <input
            className="flex-1"
            type="range"
            min={endRange.min}
            max={Math.max(endRange.min, endRange.max)}
            step={1}
            value={end}
            disabled={endDisabled}
            onChange={(e) => onChangeEnd(Number(e.target.value))}
          />
          <span className="w-12 text-right tabular-nums">{sec(end)} 秒</span>
        </label>
      </div>
      <p className="text-xs text-stone-500">
        元の動画 {sec(item.sourceDurationFrames)} 秒のうち、{sec(item.trimStartFrames)} 秒から{' '}
        {sec(end)} 秒までを使います。終了位置を動かすと、この素材の尺が変わります。
        {!canChangeDuration &&
          '（素材が 1 つのときは尺が合計と同じなので、終了位置は変えられません）'}
        {end - item.trimStartFrames < item.durationFrames &&
          '（元の動画が短いので、最後のフレームで止まります）'}
      </p>
    </div>
  )
}
