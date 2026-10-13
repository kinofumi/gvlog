import type { Caption } from '../model/types'
import { ChipGroup } from './Chip'

const PRESETS: { id: Caption['presetId']; label: string }[] = [
  { id: 'band', label: '帯' },
  { id: 'outline', label: '縁取り' },
  { id: 'box', label: 'ボックス' },
]
const POSITIONS: { id: Caption['position']; label: string }[] = [
  { id: 'top', label: '上' },
  { id: 'middle', label: '中' },
  { id: 'bottom', label: '下' },
]
const SIZES: { id: Caption['size']; label: string }[] = [
  { id: 'L', label: '大' },
  { id: 'M', label: '中' },
  { id: 'S', label: '小' },
]

const DEFAULT_CAPTION: Caption = {
  text: '',
  presetId: 'band',
  position: 'bottom',
  size: 'M',
  inOffsetFrames: 0,
  outOffsetFrames: 0,
}

/** テロップの編集: 文、見た目、位置、大きさ。文を入れると既定の見た目で付く */
export function CaptionEditor({
  caption,
  onChange,
}: {
  caption: Caption | undefined
  onChange: (caption: Caption | undefined) => void
}) {
  const update = (patch: Partial<Caption>) =>
    onChange({ ...(caption ?? DEFAULT_CAPTION), ...patch })

  return (
    <div className="space-y-2">
      <p className="text-sm">テロップ</p>
      <textarea
        className="w-full rounded border border-stone-300 px-3 py-2"
        rows={2}
        placeholder="例: 清水寺に到着！"
        value={caption?.text ?? ''}
        onChange={(e) => update({ text: e.target.value })}
      />
      {caption && (
        <div className="space-y-2">
          <ChipGroup
            options={PRESETS}
            value={caption.presetId}
            onChange={(presetId) => update({ presetId })}
          />
          <ChipGroup
            options={POSITIONS}
            value={caption.position}
            onChange={(position) => update({ position })}
          />
          <ChipGroup options={SIZES} value={caption.size} onChange={(size) => update({ size })} />
          <button
            className="min-h-11 text-xs text-stone-600 underline"
            onClick={() => onChange(undefined)}
          >
            テロップを外す
          </button>
        </div>
      )}
    </div>
  )
}
