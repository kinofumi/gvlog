import type { Caption, KenBurns, TimelineItem } from '../model/types'
import { itemsAt, transitionAt, type CompiledItem } from '../timeline/compile'
import { captionAlpha } from './caption'
import { coverRect } from './coverRect'
import type { Ctx } from './ctx'
import { drawCaption } from './drawCaption'
import { kenBurnsRect } from './kenBurns'
import { itemProgress } from './progress'

/** renderFrame が素材について知る必要のあること。MediaItem はこれを含む */
export type RenderItem = TimelineItem & {
  kind: 'photo' | 'video'
  kenBurns?: KenBurns
  caption?: Caption
}

/**
 * 描く画像とその画素寸法。寸法は画像の実際の大きさ（切り出し矩形の計算に使う）。
 * 写真は ImageBitmap とその寸法。動画のプレビューは <video> と videoWidth / videoHeight。
 * 書き出しの動画は出力サイズに cover 済みのキャンバスなので、寸法は出力サイズ（そのまま描かれる）。
 */
export type ProvidedImage = {
  image: CanvasImageSource
  width: number
  height: number
}

export type ImageProvider = {
  get(itemId: string): ProvidedImage
}

/**
 * 1 フレームを描く。決定論的（同じ入力なら同じ絵）。プレビューと書き出しで同じ関数を使う。
 * 順序: 黒で塗る → 見えている素材（0〜2 個）を描く → crossfade は後の素材を進行度の不透明度で重ねる → キャプション。
 * キャプションは合成のあとに描くので、素材のフェードに巻き込まれない。
 * 呼び出し側の描画状態（不透明度、合成モード）には左右されず、終わったら元に戻す。
 */
export function renderFrame(
  compiled: CompiledItem[],
  items: RenderItem[],
  frame: number,
  ctx: Ctx,
  images: ImageProvider,
): void {
  ctx.save()
  try {
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)

    const visible = itemsAt(compiled, frame).map((c) => ({ c, item: findItem(items, c.itemId) }))
    const transition = transitionAt(compiled, frame)

    visible.forEach(({ c, item }, i) => {
      // 2 つ見えているときの後の素材だけ、進行度の不透明度で重ねる（前は不透明のまま）
      ctx.globalAlpha = i === 1 && transition?.type === 'crossfade' ? transition.progress : 1
      drawItem(ctx, item, images.get(item.itemId), itemProgress(c, frame))
    })

    for (const { c, item } of visible) {
      if (!item.caption) continue
      const showStart = c.coreStart + item.caption.inOffsetFrames
      const showEnd = c.coreEnd - item.caption.outOffsetFrames
      drawCaption(ctx, item.caption, captionAlpha(frame, showStart, showEnd))
    }
  } finally {
    ctx.restore()
  }
}

/** 素材 1 つを画面いっぱいに描く。写真は Ken Burns の矩形、動画は cover の矩形 */
function drawItem(ctx: Ctx, item: RenderItem, source: ProvidedImage, progress: number): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const rect =
    item.kind === 'photo' && item.kenBurns
      ? kenBurnsRect(item.kenBurns, progress, source.width, source.height, W, H)
      : coverRect(source.width, source.height, W, H)
  ctx.drawImage(source.image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, W, H)
}

function findItem(items: RenderItem[], itemId: string): RenderItem {
  const item = items.find((i) => i.itemId === itemId)
  if (!item) throw new Error(`素材 ${itemId} が見つかりません。`)
  return item
}
