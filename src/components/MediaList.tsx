import { useMemo } from 'react'
import { useAppStore } from '../state/store'
import { compileTimeline } from '../timeline/compile'
import { MIN_ITEM_FRAMES } from '../timeline/durations'
import { FrameSlider } from './FrameSlider'
import { ItemEditor } from './ItemEditor'
import { Thumbnail } from './Thumbnail'
import { TotalDuration } from './TotalDuration'
import { SmallButton } from './ui/SmallButton'

/** 素材の一覧: 選択、並べ替え、削除、尺の調整、合計と上限。選んだ素材のすぐ下に設定（ItemEditor）を出す */
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
  // 各コマの区間。上限（maxFrames）をまたぐ・超えるコマに印を付けるために使う
  const compiled = useMemo(() => compileTimeline(items), [items])

  if (items.length === 0) {
    return <p className="text-sm text-stone-600">写真や動画を追加すると、ここに並びます。</p>
  }
  const { maxFrames, fps } = preset

  return (
    <div className="space-y-2">
      <TotalDuration />
      <ul className="space-y-2">
        {items.map((item, index) => {
          const selected = item.itemId === selectedItemId
          // 上限を超えた部分の案内。クロスフェードで早く見え始める分も含めた「見える区間」で判定する
          const { visibleStart, visibleEnd } = compiled[index]
          const outside = visibleStart >= maxFrames
          const cutNote = outside
            ? '（上限を超えるので入りません）'
            : visibleEnd > maxFrames
              ? `（${((maxFrames - visibleStart) / fps).toFixed(1)} 秒で切れます）`
              : ''
          return (
            <li
              key={item.itemId}
              className={`rounded border p-2 ${selected ? 'border-stone-900' : 'border-stone-300'} ${
                outside ? 'opacity-50' : ''
              }`}
              onClick={() => select(item.itemId)}
            >
              <div className="flex gap-3">
                <Thumbnail source={images[item.itemId]} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm">
                    {index + 1}. {item.kind === 'video' && '🎬 '}
                    {item.fileName}
                    {cutNote && <span className="text-red-700"> {cutNote}</span>}
                  </p>
                  <FrameSlider
                    min={MIN_ITEM_FRAMES}
                    max={maxFrames}
                    value={item.durationFrames}
                    fps={fps}
                    disabled={exporting}
                    onChange={(frames) => setItemDuration(item.itemId, frames)}
                  />
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
              </div>
              {selected && (
                // 設定の中のタップで選択をやり直さない（同じ素材なので害はないが、無駄な更新を避ける）
                <div
                  className="mt-3 border-t border-stone-200 pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ItemEditor item={item} index={index} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {selectedItemId === null && (
        <p className="text-sm text-stone-600">素材をタップすると、その下に設定が出ます。</p>
      )}
    </div>
  )
}
