import type { Caption } from '../model/types'

/** 画面の高さに対する文字サイズの比。L / M / S */
const FONT_SIZE_RATIO = { L: 0.075, M: 0.06, S: 0.045 } as const
/** テロップの幅は画面幅の 90% まで */
const MAX_WIDTH_RATIO = 0.9
/** 上下のセーフマージン（画面の高さに対する比） */
const SAFE_MARGIN_RATIO = 0.08
/** 行間（文字サイズに対する比） */
const LINE_HEIGHT_RATIO = 1.3
/** 表示の入りと出のフェード（フレーム数）。固定 */
export const CAPTION_FADE_FRAMES = 8

export function captionFontSize(size: Caption['size'], canvasHeight: number): number {
  return canvasHeight * FONT_SIZE_RATIO[size]
}

/**
 * 文字単位で折り返す。日本語は単語の区切りがないので、幅を超えた文字から次の行にする。
 * measure は文字列の描画幅を返す関数（Canvas の measureText を渡す。テストでは固定幅）。
 * 1 文字も入らない幅でも 1 行に 1 文字は置く（進まないと無限ループになるため）。
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const ch of paragraph) {
      if (line !== '' && measure(line + ch) > maxWidth) {
        lines.push(line)
        line = ch
      } else {
        line += ch
      }
    }
    if (line !== '') lines.push(line)
  }
  return lines
}

export type CaptionLayout = {
  maxWidth: number
  /** 各行の中心座標（textAlign center、textBaseline middle で描く） */
  lines: { text: string; x: number; y: number }[]
}

/** 折り返し済みの行を、上 / 中 / 下のどこに置くか決める */
export function layoutCaption(
  lines: string[],
  position: Caption['position'],
  fontSize: number,
  canvasWidth: number,
  canvasHeight: number,
): CaptionLayout {
  const margin = canvasHeight * SAFE_MARGIN_RATIO
  const lineHeight = fontSize * LINE_HEIGHT_RATIO
  const blockHeight = fontSize + lineHeight * (lines.length - 1)

  // 行の塊の上端
  let top: number
  if (position === 'top') top = margin
  else if (position === 'bottom') top = canvasHeight - margin - blockHeight
  else top = (canvasHeight - blockHeight) / 2

  return {
    maxWidth: canvasWidth * MAX_WIDTH_RATIO,
    lines: lines.map((text, i) => ({
      text,
      x: canvasWidth / 2,
      y: top + fontSize / 2 + lineHeight * i,
    })),
  }
}

/** 表示区間 [showStart, showEnd) の中での不透明度。両端で CAPTION_FADE_FRAMES かけてフェードする */
export function captionAlpha(frame: number, showStart: number, showEnd: number): number {
  if (frame < showStart || frame >= showEnd) return 0
  const fadeIn = Math.min(1, (frame - showStart) / CAPTION_FADE_FRAMES)
  const fadeOut = Math.min(1, (showEnd - frame) / CAPTION_FADE_FRAMES)
  return Math.max(0, Math.min(fadeIn, fadeOut))
}
