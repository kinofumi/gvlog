import type { Caption } from '../model/types'
import { captionFontSize, captionMaxWidth, layoutCaption, wrapText } from './caption'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** v1 は 1 書体。M5 で同梱フォントに差し替える */
const FONT_FAMILY = '"Noto Sans JP", sans-serif'
const DEFAULT_TEXT_COLOR = '#fff'
const DEFAULT_BG_COLOR = 'rgba(0, 0, 0, 0.6)'
/** 帯・ボックスの余白（文字サイズに対する比） */
const PADDING_RATIO = 0.4

/**
 * テロップを 1 つ描く。alpha は 0〜1（フェード）。
 * 折り返し → 配置 → 背景（帯 / ボックス）→ 文字（縁取りの場合は stroke）の順。
 * 呼び出し側は合成が終わってから呼ぶ（素材のフェードに巻き込まない）。
 */
export function drawCaption(ctx: Ctx, caption: Caption, alpha: number): void {
  if (alpha <= 0 || caption.text === '') return
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const fontSize = captionFontSize(caption.size, H)
  const font = `bold ${fontSize}px ${FONT_FAMILY}`

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = wrapText(caption.text, captionMaxWidth(W), (t) => ctx.measureText(t).width)
  const layout = layoutCaption(lines, caption.position, fontSize, W, H)
  if (layout.lines.length === 0) {
    ctx.restore()
    return
  }

  const textColor = caption.overrides?.textColor ?? DEFAULT_TEXT_COLOR
  const bgColor = caption.overrides?.bgColor ?? DEFAULT_BG_COLOR
  const padding = fontSize * PADDING_RATIO
  const first = layout.lines[0]
  const last = layout.lines[layout.lines.length - 1]
  const top = first.y - fontSize / 2 - padding
  const bottom = last.y + fontSize / 2 + padding

  if (caption.presetId === 'band') {
    // 画面幅いっぱいの帯
    ctx.fillStyle = bgColor
    ctx.fillRect(0, top, W, bottom - top)
  } else if (caption.presetId === 'box') {
    // 文字の幅に合わせた角丸のボックス
    const textWidth = Math.max(...layout.lines.map((l) => ctx.measureText(l.text).width))
    const left = W / 2 - textWidth / 2 - padding
    ctx.fillStyle = bgColor
    ctx.beginPath()
    ctx.roundRect(left, top, textWidth + padding * 2, bottom - top, padding / 2)
    ctx.fill()
  }

  for (const line of layout.lines) {
    if (caption.presetId === 'outline') {
      ctx.lineJoin = 'round'
      ctx.lineWidth = fontSize * 0.15
      ctx.strokeStyle = bgColor
      ctx.strokeText(line.text, line.x, line.y)
    }
    ctx.fillStyle = textColor
    ctx.fillText(line.text, line.x, line.y)
  }
  ctx.restore()
}
