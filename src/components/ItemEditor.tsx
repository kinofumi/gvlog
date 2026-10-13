import { useMemo } from 'react'
import type { KenBurns } from '../model/types'
import { useAppStore } from '../state/store'
import { clampTransition } from '../timeline/clamp'
import { compileTimeline } from '../timeline/compile'
import { maxItemFrames } from '../timeline/durations'
import { CaptionEditor } from './CaptionEditor'
import { Chip, ChipGroup } from './Chip'
import { TrimEditor } from './TrimEditor'

const KEN_BURNS: { id: KenBurns['presetId']; label: string }[] = [
  { id: 'none', label: '動かない' },
  { id: 'zoomIn', label: 'ズームイン' },
  { id: 'zoomOut', label: 'ズームアウト' },
  { id: 'panLR', label: '左→右' },
  { id: 'panRL', label: '右→左' },
]

/** クロスフェードを選んだときの最初の長さ（0.5 秒） */
const DEFAULT_CROSSFADE_FRAMES = 15

/** 選択中の素材の編集: Ken Burns（写真）/ 開始位置と終了位置（動画）、次へのつなぎ、テロップ */
export function ItemEditor() {
  const items = useAppStore((s) => s.project.items)
  const fps = useAppStore((s) => s.project.preset.fps)
  const totalFrames = useAppStore((s) => s.project.preset.totalFrames)
  const selectedItemId = useAppStore((s) => s.ui.selectedItemId)
  const setKenBurns = useAppStore((s) => s.setKenBurns)
  const setTrimStart = useAppStore((s) => s.setTrimStart)
  const setTrimEnd = useAppStore((s) => s.setTrimEnd)
  const setTransition = useAppStore((s) => s.setTransition)
  const setCaption = useAppStore((s) => s.setCaption)
  // 書き出し中は開始位置・終了位置を動かさない（プレビューの <video> がシークを始めるため）
  const exporting = useAppStore((s) => s.ui.exporting)
  // 動画の開始位置の上限は「見える長さ」（トランジション込み）で決まる
  const compiled = useMemo(() => compileTimeline(items), [items])

  const index = items.findIndex((i) => i.itemId === selectedItemId)
  const item = items[index]
  if (!item)
    return (
      <p className="text-sm text-stone-600">素材を選ぶと、ここで動きとテロップを編集できます。</p>
    )

  const following = items[index + 1]
  const maxTransition = following
    ? clampTransition(Number.MAX_SAFE_INTEGER, item.durationFrames, following.durationFrames)
    : 0
  // 長さ 0 のクロスフェードは描画上カットと同じなので、カットとして見せる
  const crossfadeFrames =
    item.transitionOut?.type === 'crossfade' ? item.transitionOut.durationFrames : 0
  const isCrossfade = crossfadeFrames > 0

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold">
        {index + 1}. {item.fileName}
      </h2>

      {item.kind === 'photo' && (
        <div className="space-y-1">
          <p className="text-sm">動き</p>
          <ChipGroup
            options={KEN_BURNS}
            value={item.kenBurns.presetId}
            onChange={(id) => setKenBurns(item.itemId, id)}
          />
        </div>
      )}

      {item.kind === 'video' && (
        <TrimEditor
          item={item}
          visibleLength={compiled[index].visibleEnd - compiled[index].visibleStart}
          maxDurationFrames={maxItemFrames(items.length, totalFrames)}
          canChangeDuration={items.length > 1}
          fps={fps}
          disabled={exporting}
          onChangeStart={(frames) => setTrimStart(item.itemId, frames)}
          onChangeEnd={(frames) => setTrimEnd(item.itemId, frames)}
        />
      )}

      <div className="space-y-1">
        <p className="text-sm">次へのつなぎ{!following && '（最後の素材には付けられません）'}</p>
        <div className="flex flex-wrap gap-2">
          <Chip
            label="カット"
            active={!isCrossfade}
            onClick={() => setTransition(item.itemId, { type: 'cut', durationFrames: 0 })}
          />
          <Chip
            label="クロスフェード"
            active={isCrossfade}
            disabled={!following}
            onClick={() =>
              setTransition(item.itemId, {
                type: 'crossfade',
                durationFrames: Math.min(DEFAULT_CROSSFADE_FRAMES, maxTransition),
              })
            }
          />
        </div>
        {isCrossfade && following && (
          <label className="flex items-center gap-2 text-xs">
            <input
              className="flex-1"
              type="range"
              min={0}
              max={maxTransition}
              step={1}
              value={crossfadeFrames}
              onChange={(e) =>
                setTransition(item.itemId, {
                  type: 'crossfade',
                  durationFrames: Number(e.target.value),
                })
              }
            />
            <span className="w-12 text-right tabular-nums">
              {(crossfadeFrames / fps).toFixed(1)} 秒
            </span>
          </label>
        )}
      </div>

      <CaptionEditor
        caption={item.caption}
        onChange={(caption) => setCaption(item.itemId, caption)}
      />
    </section>
  )
}
