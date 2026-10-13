import { useAppStore } from '../state/store'
import { MIN_ITEM_FRAMES, maxItemFrames } from '../timeline/durations'
import { Thumbnail } from './Thumbnail'

/** 素材の一覧: 選択、並べ替え、削除、尺の調整 */
export function MediaList() {
  const items = useAppStore((s) => s.project.items)
  const preset = useAppStore((s) => s.project.preset)
  const images = useAppStore((s) => s.images)
  const selectedItemId = useAppStore((s) => s.ui.selectedItemId)
  const select = useAppStore((s) => s.select)
  const moveItem = useAppStore((s) => s.moveItem)
  const removeItem = useAppStore((s) => s.removeItem)
  const setItemDuration = useAppStore((s) => s.setItemDuration)
  // 書き出し中は使用中の画像を閉じてしまう操作（削除・並べ替え）と尺の変更を止める
  const exporting = useAppStore((s) => s.ui.exporting)

  if (items.length === 0) {
    return <p className="text-sm text-stone-600">写真や動画を追加すると、ここに並びます。</p>
  }
  // 1 つの素材が取れる最大の尺（他が全員最小尺のとき）
  const maxFrames = maxItemFrames(items.length, preset.totalFrames)

  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const selected = item.itemId === selectedItemId
        return (
          <li
            key={item.itemId}
            className={`flex gap-3 rounded border p-2 ${selected ? 'border-stone-900' : 'border-stone-300'}`}
            onClick={() => select(item.itemId)}
          >
            <Thumbnail source={images[item.itemId]} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm">
                {index + 1}. {item.kind === 'video' && '🎬 '}
                {item.fileName}
              </p>
              <label className="flex items-center gap-2 text-xs">
                {/* step は 1 フレーム。3（0.1 秒）にすると均等割りの値が格子に乗らず、つまみと表示がずれる */}
                <input
                  className="flex-1"
                  type="range"
                  min={MIN_ITEM_FRAMES}
                  max={maxFrames}
                  step={1}
                  value={item.durationFrames}
                  disabled={items.length === 1 || exporting}
                  onChange={(e) => setItemDuration(item.itemId, Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="w-12 text-right tabular-nums">
                  {(item.durationFrames / preset.fps).toFixed(1)} 秒
                </span>
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <SmallButton
                label="▲"
                disabled={index === 0 || exporting}
                onClick={() => moveItem(item.itemId, index - 1)}
              />
              <SmallButton
                label="▼"
                disabled={index === items.length - 1 || exporting}
                onClick={() => moveItem(item.itemId, index + 1)}
              />
              <SmallButton
                label="削除"
                disabled={exporting}
                onClick={() => removeItem(item.itemId)}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function SmallButton({
  label,
  disabled,
  onClick,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className="min-h-11 min-w-11 rounded border border-stone-400 px-2 text-xs disabled:text-stone-300"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {label}
    </button>
  )
}
