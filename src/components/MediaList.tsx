import { useMemo } from 'react'
import { useAppStore } from '../state/store'
import { compileTimeline } from '../timeline/compile'
import { MIN_ITEM_FRAMES } from '../timeline/durations'
import { FrameSlider } from './FrameSlider'
import { ItemEditor } from './ItemEditor'
import { Thumbnail } from './Thumbnail'
import { TotalDuration } from './TotalDuration'
import { SmallButton } from './ui/SmallButton'
import { Button } from './ui/Button'

/**
 * 素材の一覧: 並べ替え、削除、尺の調整、合計と上限。「この素材を編集する」を押した素材のすぐ下に設定（ItemEditor）を出す。
 * 以前は行のタップで開いていたが気づかれなかったので、ボタンに一本化した（2026-11-14。行タップとボタンの 2 経路だと開閉の挙動がずれる）。
 */
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
            >
              <div className="flex gap-3">
                <Thumbnail source={images[item.itemId]} />
                <p className="min-w-0 flex-1 text-sm break-all">
                  {index + 1}. {item.kind === 'video' && '🎬 '}
                  {item.fileName}
                  {cutNote && <span className="text-red-700"> {cutNote}</span>}
                </p>
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
              {/* 尺のスライダーは行の下に全幅で置く（両側の矢印と秒の表示が入る幅を確保するため） */}
              <div className="mt-2">
                <FrameSlider
                  label={`${index + 1} 番目の尺`}
                  min={MIN_ITEM_FRAMES}
                  max={maxFrames}
                  value={item.durationFrames}
                  fps={fps}
                  disabled={exporting}
                  onChange={(frames) => setItemDuration(item.itemId, frames)}
                />
              </div>
              <Button
                variant="secondary"
                className="mt-2"
                aria-expanded={selected}
                aria-controls={`item-editor-${item.itemId}`}
                onClick={() => select(selected ? null : item.itemId)}
              >
                {selected ? '編集を閉じる' : 'この素材を編集する'}
              </Button>
              {selected && (
                <div
                  id={`item-editor-${item.itemId}`}
                  className="mt-3 border-t border-stone-200 pt-3"
                >
                  <ItemEditor item={item} index={index} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {selectedItemId === null && (
        <p className="text-sm text-stone-600">
          「この素材を編集する」を押すと、その下に設定（写真の動き、動画の開始位置・終了位置、次へのつなぎ、テロップ）が出ます。
        </p>
      )}
    </div>
  )
}
