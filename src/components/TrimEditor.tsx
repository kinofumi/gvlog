import type { VideoItem } from '../model/types'
import { maxTrimStart, trimEndRange } from '../timeline/trim'
import { FrameSlider } from './FrameSlider'

/**
 * 動画のどこを使うか（plan §2.3、ADR 014）。
 * - 開始位置: 使う範囲を尺のまま前後に動かす。上限は元動画の尺 − 見える長さ。
 * - 終了位置: 開始位置は変えず、この素材の尺を「終了位置 − 開始位置」にする。他の素材は動かない。
 * 元動画が見える長さより短いときはどちらも動かせず、足りない分は末尾フレームをホールドする（尺は一覧のスライダーで変える）。
 */
export function TrimEditor({
  item,
  visibleLength,
  maxDurationFrames,
  fps,
  disabled,
  onChangeStart,
  onChangeEnd,
}: {
  item: VideoItem
  /** この素材が画面に見えている長さ（トランジション込み、フレーム数） */
  visibleLength: number
  /** 1 コマの尺の上限（プリセットの maxFrames） */
  maxDurationFrames: number
  fps: number
  disabled?: boolean
  onChangeStart: (trimStartFrames: number) => void
  onChangeEnd: (trimEndFrames: number) => void
}) {
  const maxStart = maxTrimStart(item.sourceDurationFrames, visibleLength)
  // 終了位置 = 開始位置 + 尺。元動画が足りないとき（ホールド中）はスライダーの範囲の外に出るので動かせない。
  // 範囲内の値だけ渡さないと、つまみの位置と表示がずれたり、触っただけで尺が縮んだりする
  const end = item.trimStartFrames + item.durationFrames
  const range = trimEndRange(item, visibleLength, maxDurationFrames)
  const holding = end > range.max
  const endDisabled = disabled || holding
  // 実際に使う範囲の終わり。クロスフェードがあるとその分だけ終了位置より先も使う
  const usedEnd = Math.min(item.trimStartFrames + visibleLength, item.sourceDurationFrames)
  const sec = (frames: number) => (frames / fps).toFixed(1)
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm">開始位置</p>
        <FrameSlider
          label="開始位置"
          decreaseLabel="0.1 秒前へ"
          increaseLabel="0.1 秒後ろへ"
          min={0}
          max={maxStart}
          value={item.trimStartFrames}
          fps={fps}
          disabled={maxStart === 0 || disabled}
          onChange={onChangeStart}
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm">終了位置</p>
        <FrameSlider
          label="終了位置"
          decreaseLabel="0.1 秒前へ"
          increaseLabel="0.1 秒後ろへ"
          min={range.min}
          max={Math.max(range.min, range.max)}
          value={Math.max(range.min, Math.min(end, range.max))}
          fps={fps}
          disabled={endDisabled}
          onChange={onChangeEnd}
        />
      </div>
      <p className="text-xs text-stone-500">
        元の動画 {sec(item.sourceDurationFrames)} 秒のうち、{sec(item.trimStartFrames)} 秒から{' '}
        {sec(usedEnd)} 秒までを使います。終了位置を動かすと、このコマの尺が変わります。
        {visibleLength > item.durationFrames &&
          '（クロスフェードの分だけ、終了位置より先も使います）'}
        {holding &&
          '（元の動画が短いので、最後のフレームで止まります。尺は素材一覧のスライダーで変えられます）'}
      </p>
    </div>
  )
}
