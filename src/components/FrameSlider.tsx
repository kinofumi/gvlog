type Props = {
  min: number
  max: number
  /** フレーム数。秒に直して右に表示する */
  value: number
  fps: number
  disabled?: boolean
  onChange: (frames: number) => void
}

/** フレーム数のスライダーと秒の表示（尺、クロスフェードの長さ、開始位置・終了位置で共用） */
export function FrameSlider({ min, max, value, fps, disabled, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-xs">
      {/* step は 1 フレーム。3（0.1 秒）にすると均等割りの値が格子に乗らず、つまみと表示がずれる */}
      <input
        className="flex-1"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        // 一覧の中（li の onClick で選択）に置いても、つまみの操作で選択が変わらないようにする
        onClick={(e) => e.stopPropagation()}
      />
      <span className="w-12 text-right tabular-nums">{(value / fps).toFixed(1)} 秒</span>
    </label>
  )
}
