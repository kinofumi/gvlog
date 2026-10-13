import type { Caption } from '../model/types'
import { captionFontSize, captionMaxWidth, layoutCaption, wrapText } from './caption'
import type { Ctx } from './ctx'

/** v1 は 1 書体。M5 で同梱フォントに差し替える */
const FONT_FAMILY = '"Noto Sans JP", sans-serif'
const DEFAULT_TEXT_COLOR = '#fff'
/** 背景色の既定。帯とボックスは半透明、縁取りは読みやすさのために不透明 */
const DEFAULT_BG_COLOR = { band: 'rgba(0, 0, 0, 0.6)', box: 'rgba(0, 0, 0, 0.6)', outline: '#000' }
/** 帯・ボックスの余白（文字サイズに対する比） */
const PADDING_RATIO = 0.4

/**
 * テロップを 1 つ描く。alpha は 0〜1（フェード）。
 * 折り返し → 配置 → 背景（帯 / ボックス）→ 文字（縁取りの場合は stroke）の順。
 * 呼び出し側は合成が終わってから呼ぶ（素材のフェードに巻き込まない）。
 */
export function drawCaption(ctx: Ctx, caption: Caption, alpha: number): void {
  // 空白や改行だけなら、帯やボックスだけが出てしまうので何も描かない
  if (alpha <= 0 || caption.text.trim() === '') return
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const fontSize = captionFontSize(caption.size, H)

  ctx.save()
  try {
    ctx.globalAlpha = alpha
    ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = wrapText(caption.text, captionMaxWidth(W), (t) => ctx.measureText(t).width)
    const layout = layoutCaption(lines, caption.position, fontSize, W, H)

    const textColor = caption.overrides?.textColor ?? DEFAULT_TEXT_COLOR
    const bgColor = caption.overrides?.bgColor ?? DEFAULT_BG_COLOR[caption.presetId]
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
      // 文字の幅に合わせた角丸のボックス。左右の余白は画面からはみ出さない範囲で
      const textWidth = Math.max(...layout.lines.map((l) => ctx.measureText(l.text).width))
      const sidePadding = Math.min(padding, (W - textWidth) / 2)
      const left = W / 2 - textWidth / 2 - sidePadding
      ctx.fillStyle = bgColor
      ctx.beginPath()
      ctx.roundRect(left, top, textWidth + sidePadding * 2, bottom - top, padding / 2)
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
  } finally {
    ctx.restore()
  }
}
