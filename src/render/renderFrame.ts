import { coverRect } from './coverRect'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * 画像を出力キャンバスいっぱいに cover フィットで描く。
 * 画像とキャンバスの縦横比が同じなら、そのまま全面に描く。
 */
export function drawCover(
  ctx: Ctx,
  image: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
): void {
  const dstWidth = ctx.canvas.width
  const dstHeight = ctx.canvas.height
  const { sx, sy, sw, sh } = coverRect(srcWidth, srcHeight, dstWidth, dstHeight)
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, dstWidth, dstHeight)
}
