import type { ProvidedImage } from '../render/renderFrame'

/** 表紙の下地の色（濃い灰色。文字は白の縁取りテロップで描く） */
export const COVER_COLOR = '#292524'
/** 終わりの色（白フェードアウトの行き先なので白） */
export const END_COLOR = '#ffffff'

/**
 * 1 色の絵を作る（表紙と終わり用）。
 * 1 色なので 1×1 の canvas で足りる（描画は cover で画面いっぱいに引き伸ばす）。出力サイズで作ると 1 枚 8 MB を持ち続けることになる。
 * canvas をそのまま描画元にするので、ImageBitmap と違って閉じる必要がない。
 */
export function makeSolidImage(color: string): ProvidedImage {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('表紙を描くためのキャンバスを作れませんでした。')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  return { image: canvas, width: 1, height: 1 }
}
