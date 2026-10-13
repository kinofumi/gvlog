import { PHOTO_SCALE_FACTOR } from './limits'
import { MediaError } from './errors'

export type ImportedImage = {
  bitmap: ImageBitmap
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

/**
 * 写真を読み込み、長辺が maxLongSide 以下になるよう縮小した ImageBitmap を返す。
 * createImageBitmap は既定で EXIF の回転を適用するので、アプリ側で回転しない。
 *
 * 注意: 元の寸法を知るために一度フルサイズでデコードしている。
 * 大きな写真では一時的にメモリを使うので、縮小後すぐに元の bitmap を close する。
 */
export async function importImage(
  file: File,
  outputWidth: number,
  outputHeight: number,
): Promise<ImportedImage> {
  let full: ImageBitmap
  try {
    full = await createImageBitmap(file)
  } catch {
    throw new MediaError('この写真は読み込めませんでした。JPEG または PNG を選んでください。')
  }

  const maxLongSide = Math.max(outputWidth, outputHeight) * PHOTO_SCALE_FACTOR
  const longSide = Math.max(full.width, full.height)
  if (longSide <= maxLongSide) {
    return {
      bitmap: full,
      width: full.width,
      height: full.height,
      originalWidth: full.width,
      originalHeight: full.height,
    }
  }

  // close() したあとは width/height が 0 になるので、先に控えておく
  const originalWidth = full.width
  const originalHeight = full.height
  const scale = maxLongSide / longSide
  const width = Math.round(originalWidth * scale)
  const height = Math.round(originalHeight * scale)
  try {
    const resized = await createImageBitmap(full, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high',
    })
    return { bitmap: resized, width, height, originalWidth, originalHeight }
  } finally {
    // 縮小に成功しても失敗しても、フルサイズのビットマップは必ず閉じる
    full.close()
  }
}
