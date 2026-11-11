import type { ProvidedImage } from '../render/renderFrame'

/** 表紙の下地の色（濃い灰色。文字は白の縁取りテロップで描く） */
export const COVER_COLOR = '#292524'
/** 終わりの色（白フェードアウトの行き先なので白） */
export const END_COLOR = '#ffffff'

/**
 * 1 色で塗った出力サイズの絵を作る（表紙と終わり用）。
 * canvas をそのまま描画元にするので、ImageBitmap と違って閉じる必要がない。
 */
export function makeSolidImage(width: number, height: number, color: string): ProvidedImage {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('表紙を描くためのキャンバスを作れませんでした。')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return { image: canvas, width, height }
}
