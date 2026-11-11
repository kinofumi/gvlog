import { useMemo } from 'react'
import type { KenBurns, MediaItem, Transition } from '../model/types'
import { useAppStore } from '../state/store'
import { clampTransition } from '../timeline/clamp'
import { compileTimeline } from '../timeline/compile'
import { CaptionEditor } from './CaptionEditor'
import { Chip, ChipGroup } from './Chip'
import { FrameSlider } from './FrameSlider'
import { TrimEditor } from './TrimEditor'

const KEN_BURNS: { id: KenBurns['presetId']; label: string }[] = [
  { id: 'none', label: '動かない' },
  { id: 'zoomIn', label: 'ズームイン' },
  { id: 'zoomOut', label: 'ズームアウト' },
  { id: 'panLR', label: '左→右' },
  { id: 'panRL', label: '右→左' },
  { id: 'panTB', label: '上→下' },
  { id: 'panBT', label: '下→上' },
]

/** クロスフェード・白フェードを選んだときの最初の長さ（約 0.5 秒）。偶数にすると白フェードの境界のフレームが真っ白になる */
const DEFAULT_TRANSITION_FRAMES = 16

/** つなぎの種類のチップ。cut 以外は長さのスライダーを出す */
const TRANSITIONS: { id: Transition['type']; label: string }[] = [
  { id: 'cut', label: 'カット' },
  { id: 'crossfade', label: 'クロスフェード' },
  { id: 'fadeWhite', label: '白フェード' },
]

type Props = {
  /** 編集する素材と、一覧での位置（MediaList が選択中の素材の下に置く） */
  item: MediaItem
  index: number
}

/** 1 つの素材の編集: Ken Burns（写真）/ 開始位置と終了位置（動画）、次へのつなぎ、テロップ */
export function ItemEditor({ item, index }: Props) {
  const items = useAppStore((s) => s.project.items)
  const fps = useAppStore((s) => s.project.preset.fps)
  const maxFrames = useAppStore((s) => s.project.preset.maxFrames)
  const setKenBurns = useAppStore((s) => s.setKenBurns)
  const setTrimStart = useAppStore((s) => s.setTrimStart)
  const setTrimEnd = useAppStore((s) => s.setTrimEnd)
  const setTransition = useAppStore((s) => s.setTransition)
  const setCaption = useAppStore((s) => s.setCaption)
  // 書き出し中は開始位置・終了位置を動かさない（プレビューの <video> がシークを始めるため）
  const exporting = useAppStore((s) => s.ui.exporting)
  // 動画の開始位置の上限は「見える長さ」（トランジション込み）で決まる
  const compiled = useMemo(() => compileTimeline(items), [items])

  const following = items[index + 1]
  const maxTransition = following
    ? clampTransition(Number.MAX_SAFE_INTEGER, item.durationFrames, following.durationFrames)
    : 0
  // 長さ 0 のつなぎは描画上カットと同じなので、カットとして見せる
  const transition = item.transitionOut ?? { type: 'cut', durationFrames: 0 }
  const transitionType = transition.durationFrames > 0 ? transition.type : 'cut'

  return (
    <div className="space-y-4">
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
          maxDurationFrames={maxFrames}
          fps={fps}
          disabled={exporting}
          onChangeStart={(frames) => setTrimStart(item.itemId, frames)}
          onChangeEnd={(frames) => setTrimEnd(item.itemId, frames)}
        />
      )}

      <div className="space-y-1">
        <p className="text-sm">次へのつなぎ{!following && '（最後の素材には付けられません）'}</p>
        <div className="flex flex-wrap gap-2">
          {TRANSITIONS.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              active={transitionType === t.id}
              disabled={t.id !== 'cut' && !following}
              onClick={() =>
                setTransition(item.itemId, {
                  type: t.id,
                  durationFrames:
                    t.id === 'cut' ? 0 : Math.min(DEFAULT_TRANSITION_FRAMES, maxTransition),
                })
              }
            />
          ))}
        </div>
        {transitionType !== 'cut' && following && (
          <FrameSlider
            min={0}
            max={maxTransition}
            value={transition.durationFrames}
            fps={fps}
            onChange={(frames) =>
              setTransition(item.itemId, { type: transitionType, durationFrames: frames })
            }
          />
        )}
      </div>

      <CaptionEditor
        caption={item.caption}
        onChange={(caption) => setCaption(item.itemId, caption)}
      />
    </div>
  )
}
