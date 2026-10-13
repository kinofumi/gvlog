import type { Caption } from '../model/types'
import { clamp01 } from './clamp01'

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

/** 折り返しに使う最大幅（画面幅の 90%）。wrapText に渡す */
export function captionMaxWidth(canvasWidth: number): number {
  return canvasWidth * MAX_WIDTH_RATIO
}

/** 見た目の 1 文字（結合文字や ZWJ 絵文字を含む）ごとに分ける。コードポイント単位だと絵文字が分断される */
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
function graphemes(text: string): string[] {
  return [...segmenter.segment(text)].map((s) => s.segment)
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
  if (text === '') return []
  const lines: string[] = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = ''
    for (const ch of graphemes(paragraph)) {
      if (line !== '' && measure(line + ch) > maxWidth) {
        lines.push(line)
        line = ch
      } else {
        line += ch
      }
    }
    // 空の段落（意図した空行）もそのまま 1 行として残す
    lines.push(line)
  }
  return lines
}

export type CaptionLayout = {
  /** 各行の中心座標（textAlign center、textBaseline middle で描く） */
  lines: { text: string; x: number; y: number }[]
  /** セーフマージンに収まらず、行を切り捨てた */
  overflow: boolean
}

/** セーフマージンの内側に収まる最大の行数 */
export function maxCaptionLines(fontSize: number, canvasHeight: number): number {
  const usable = canvasHeight * (1 - SAFE_MARGIN_RATIO * 2)
  const lineHeight = fontSize * LINE_HEIGHT_RATIO
  return Math.max(1, Math.floor((usable - fontSize) / lineHeight) + 1)
}

/**
 * 折り返し済みの行を、上 / 中 / 下のどこに置くか決める。
 * 収まらない行は切り捨てる（文字サイズは変えない。画面に出すテロップの文字サイズをグループで揃えるため）。
 */
export function layoutCaption(
  allLines: string[],
  position: Caption['position'],
  fontSize: number,
  canvasWidth: number,
  canvasHeight: number,
): CaptionLayout {
  const margin = canvasHeight * SAFE_MARGIN_RATIO
  const lineHeight = fontSize * LINE_HEIGHT_RATIO
  const limit = maxCaptionLines(fontSize, canvasHeight)
  const lines = allLines.slice(0, limit)
  const blockHeight = fontSize + lineHeight * (lines.length - 1)

  // 行の塊の上端
  let top: number
  if (position === 'top') top = margin
  else if (position === 'bottom') top = canvasHeight - margin - blockHeight
  else top = (canvasHeight - blockHeight) / 2

  return {
    lines: lines.map((text, i) => ({
      text,
      x: canvasWidth / 2,
      y: top + fontSize / 2 + lineHeight * i,
    })),
    overflow: allLines.length > lines.length,
  }
}

/** 表示区間 [showStart, showEnd) の中での不透明度。両端で CAPTION_FADE_FRAMES かけてフェードする */
export function captionAlpha(frame: number, showStart: number, showEnd: number): number {
  if (frame < showStart || frame >= showEnd) return 0
  // 最初のフレームで 1/8、8 フレーム目で 1。出も同じ形で対称にする
  const fadeIn = (frame - showStart + 1) / CAPTION_FADE_FRAMES
  const fadeOut = (showEnd - frame) / CAPTION_FADE_FRAMES
  return clamp01(Math.min(fadeIn, fadeOut))
}
