import { framesPerStep, stepFrames } from './frameStep'
import { SmallButton } from './ui/SmallButton'

type Props = {
  /** 何を動かすスライダーか（読み上げ用。「尺」「開始位置」など。画面には出さない） */
  label: string
  /** 矢印 1 回で動かす秒数。既定は 0.1 秒。つなぎの長さは 0.2 秒（6 フレーム、偶数）にして白フェードの境界が真っ白のままになるようにする（ADR 016） */
  stepSeconds?: number
  /** 矢印の意味。既定は「0.1 秒短く」「0.1 秒長く」。開始位置のように短い・長いで表せないものは呼び出し側が変える */
  decreaseLabel?: string
  increaseLabel?: string
  min: number
  max: number
  /** フレーム数。秒に直して右に表示する */
  value: number
  fps: number
  disabled?: boolean
  onChange: (frames: number) => void
}

/**
 * フレーム数のスライダーと秒の表示（尺、つなぎの長さ、開始位置・終了位置で共用）。
 * スライダーは指だと細かく合わせにくいので、両側の矢印で少しずつ動かせる（利用者の要望、2026-11-14）。
 */
export function FrameSlider({
  label,
  stepSeconds = 0.1,
  decreaseLabel = `${stepSeconds} 秒短く`,
  increaseLabel = `${stepSeconds} 秒長く`,
  min,
  max,
  value,
  fps,
  disabled,
  onChange,
}: Props) {
  const step = framesPerStep(fps, stepSeconds)
  const move = (direction: 1 | -1) => onChange(stepFrames(value, direction, step, min, max))
  return (
    <div className="flex items-center gap-1 text-xs">
      <SmallButton
        label="◀"
        variant="secondary"
        title={`${label}を${decreaseLabel}`}
        disabled={disabled || value <= min}
        onClick={() => move(-1)}
      />
      {/* step は 1 フレーム。3（0.1 秒）にすると動画の尺など 3 の倍数でない値が格子に乗らず、つまみと表示がずれる */}
      <input
        className="flex-1 min-w-0"
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <SmallButton
        label="▶"
        variant="secondary"
        title={`${label}を${increaseLabel}`}
        disabled={disabled || value >= max}
        onClick={() => move(1)}
      />
      <span className="w-12 text-right tabular-nums">{(value / fps).toFixed(1)} 秒</span>
    </div>
  )
}
