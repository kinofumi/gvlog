import type { Caption, KenBurns, Transition } from '../model/types'
import { useAppStore } from '../state/store'
import { clampTransition } from '../timeline/clamp'

const KEN_BURNS: { id: KenBurns['presetId']; label: string }[] = [
  { id: 'none', label: '動かない' },
  { id: 'zoomIn', label: 'ズームイン' },
  { id: 'zoomOut', label: 'ズームアウト' },
  { id: 'panLR', label: '左→右' },
  { id: 'panRL', label: '右→左' },
]

const DEFAULT_CAPTION: Caption = {
  text: '',
  presetId: 'band',
  position: 'bottom',
  size: 'M',
  inOffsetFrames: 0,
  outOffsetFrames: 0,
}

/** 選択中の素材の編集: Ken Burns、次へのつなぎ、キャプション */
export function ItemEditor() {
  const items = useAppStore((s) => s.project.items)
  const preset = useAppStore((s) => s.project.preset)
  const selectedItemId = useAppStore((s) => s.ui.selectedItemId)
  const setKenBurns = useAppStore((s) => s.setKenBurns)
  const setTransition = useAppStore((s) => s.setTransition)
  const setCaption = useAppStore((s) => s.setCaption)
  const importing = useAppStore((s) => s.ui.importing)

  const index = items.findIndex((i) => i.itemId === selectedItemId)
  const item = items[index]
  if (!item)
    return (
      <p className="text-sm text-stone-600">素材を選ぶと、ここで動きとテロップを編集できます。</p>
    )

  if (importing) {
    return <p className="text-sm text-stone-600">写真の取り込みが終わるまでお待ちください。</p>
  }

  const following = items[index + 1]
  const transition: Transition = item.transitionOut ?? { type: 'cut', durationFrames: 0 }
  const maxTransition = following
    ? clampTransition(Number.MAX_SAFE_INTEGER, item.durationFrames, following.durationFrames)
    : 0
  const caption = item.caption

  function updateCaption(patch: Partial<Caption>) {
    setCaption(item.itemId, { ...(caption ?? DEFAULT_CAPTION), ...patch })
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold">
        {index + 1}. {item.fileName}
      </h2>

      {item.kind === 'photo' && (
        <div className="space-y-1">
          <p className="text-sm">動き</p>
          <div className="flex flex-wrap gap-2">
            {KEN_BURNS.map((k) => (
              <Chip
                key={k.id}
                label={k.label}
                active={item.kenBurns.presetId === k.id}
                onClick={() => setKenBurns(item.itemId, k.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-sm">次へのつなぎ{!following && '（最後の素材なので使われません）'}</p>
        <div className="flex flex-wrap gap-2">
          <Chip
            label="カット"
            active={transition.type === 'cut'}
            onClick={() => setTransition(item.itemId, { type: 'cut', durationFrames: 0 })}
          />
          <Chip
            label="クロスフェード"
            active={transition.type === 'crossfade'}
            onClick={() =>
              setTransition(item.itemId, {
                type: 'crossfade',
                durationFrames: Math.min(15, maxTransition),
              })
            }
          />
        </div>
        {transition.type === 'crossfade' && following && (
          <label className="flex items-center gap-2 text-xs">
            <input
              className="flex-1"
              type="range"
              min={0}
              max={maxTransition}
              step={3}
              value={transition.durationFrames}
              onChange={(e) =>
                setTransition(item.itemId, {
                  type: 'crossfade',
                  durationFrames: Number(e.target.value),
                })
              }
            />
            <span className="w-12 text-right tabular-nums">
              {(transition.durationFrames / preset.fps).toFixed(1)} 秒
            </span>
          </label>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm">テロップ</p>
        <textarea
          className="w-full rounded border border-stone-300 px-3 py-2"
          rows={2}
          placeholder="例: 清水寺に到着！"
          value={caption?.text ?? ''}
          onChange={(e) => updateCaption({ text: e.target.value })}
        />
        {caption && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Chip
                label="帯"
                active={caption.presetId === 'band'}
                onClick={() => updateCaption({ presetId: 'band' })}
              />
              <Chip
                label="縁取り"
                active={caption.presetId === 'outline'}
                onClick={() => updateCaption({ presetId: 'outline' })}
              />
              <Chip
                label="ボックス"
                active={caption.presetId === 'box'}
                onClick={() => updateCaption({ presetId: 'box' })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="上"
                active={caption.position === 'top'}
                onClick={() => updateCaption({ position: 'top' })}
              />
              <Chip
                label="中"
                active={caption.position === 'middle'}
                onClick={() => updateCaption({ position: 'middle' })}
              />
              <Chip
                label="下"
                active={caption.position === 'bottom'}
                onClick={() => updateCaption({ position: 'bottom' })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="大"
                active={caption.size === 'L'}
                onClick={() => updateCaption({ size: 'L' })}
              />
              <Chip
                label="中"
                active={caption.size === 'M'}
                onClick={() => updateCaption({ size: 'M' })}
              />
              <Chip
                label="小"
                active={caption.size === 'S'}
                onClick={() => updateCaption({ size: 'S' })}
              />
            </div>
            <button
              className="text-xs text-stone-600 underline"
              onClick={() => setCaption(item.itemId, undefined)}
            >
              テロップを外す
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`min-h-11 rounded-full border px-4 text-sm ${
        active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-400'
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
