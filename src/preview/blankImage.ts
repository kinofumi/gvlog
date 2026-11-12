import type { ProvidedImage } from '../render/renderFrame'

/** 画像がまだ無い素材の代わり（復元中など）。黒い 1×1 の canvas。編集のプレビューとつなげるのプレビューで共用 */
export const BLANK_IMAGE: ProvidedImage = { image: blankCanvas(), width: 1, height: 1 }

function blankCanvas(): CanvasImageSource {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  return c
}
