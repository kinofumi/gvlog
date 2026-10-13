import { coverRect } from './coverRect'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * 画像を出力キャンバスいっぱいに cover フィットで描く（M0 の書き出しで使用。M3 で renderFrame に置き換える）。
 * 先に全体を黒で塗る。透過 PNG を毎フレーム重ね塗りすると、だんだん不透明になってしまうため。
 */
export function drawCover(
  ctx: Ctx,
  image: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
): void {
  const dstWidth = ctx.canvas.width
  const dstHeight = ctx.canvas.height
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, dstWidth, dstHeight)
  const { sx, sy, sw, sh } = coverRect(srcWidth, srcHeight, dstWidth, dstHeight)
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, dstWidth, dstHeight)
}
