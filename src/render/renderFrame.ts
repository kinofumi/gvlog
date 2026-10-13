import type { Caption, KenBurns, TimelineItem } from '../model/types'
import { itemsAt, transitionAt, type CompiledItem } from '../timeline/compile'
import { captionAlpha } from './caption'
import { coverRect } from './coverRect'
import { drawCaption } from './drawCaption'
import { kenBurnsRect } from './kenBurns'
import { itemProgress } from './progress'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** renderFrame が素材について知る必要のあること。MediaItem はこれを含む */
export type RenderItem = TimelineItem & {
  kind: 'photo' | 'video'
  /** 元画像の寸法（回転適用後） */
  width: number
  height: number
  kenBurns?: KenBurns
  caption?: Caption
}

/** 描く画像を渡す役。写真は ImageBitmap、動画はプレビューなら <video>、書き出しならデコード済みフレーム */
export type ImageProvider = {
  get(itemId: string): CanvasImageSource
}

/**
 * 1 フレームを描く。決定論的（同じ入力なら同じ絵）。プレビューと書き出しで同じ関数を使う。
 * 順序: 黒で塗る → 見えている素材（0〜2 個）を描く → crossfade は後の素材を進行度の不透明度で重ねる → キャプション。
 * キャプションは合成のあとに描くので、素材のフェードに巻き込まれない。
 */
export function renderFrame(
  compiled: CompiledItem[],
  items: RenderItem[],
  frame: number,
  ctx: Ctx,
  images: ImageProvider,
): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  const visible = itemsAt(compiled, frame)
  const transition = transitionAt(compiled, frame)

  visible.forEach((c, i) => {
    const item = findItem(items, c.itemId)
    // 2 つ見えているときの後の素材だけ、進行度の不透明度で重ねる（前は不透明のまま）
    const alpha = i === 1 && transition?.type === 'crossfade' ? transition.progress : 1
    ctx.globalAlpha = alpha
    drawItem(ctx, item, images.get(item.itemId), itemProgress(c, frame))
  })
  ctx.globalAlpha = 1

  for (const c of visible) {
    const item = findItem(items, c.itemId)
    if (!item.caption) continue
    const showStart = c.coreStart + item.caption.inOffsetFrames
    const showEnd = c.coreEnd - item.caption.outOffsetFrames
    drawCaption(ctx, item.caption, captionAlpha(frame, showStart, showEnd))
  }
}

/** 素材 1 つを画面いっぱいに描く。写真は Ken Burns の矩形、動画は cover の矩形 */
function drawItem(ctx: Ctx, item: RenderItem, image: CanvasImageSource, progress: number): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const rect =
    item.kind === 'photo' && item.kenBurns
      ? kenBurnsRect(item.kenBurns, progress, item.width, item.height, W, H)
      : coverRect(item.width, item.height, W, H)
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, W, H)
}

function findItem(items: RenderItem[], itemId: string): RenderItem {
  const item = items.find((i) => i.itemId === itemId)
  if (!item) throw new Error(`素材 ${itemId} が見つかりません。`)
  return item
}
