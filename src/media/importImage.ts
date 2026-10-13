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
 * 写真を読み込み、長辺が出力の長辺 × PHOTO_SCALE_FACTOR 以下になるよう縮小した ImageBitmap を返す。
 * 寸法はまず <img> でヘッダーから読み（デコードしない）、デコードは縮小指定付きの createImageBitmap で 1 回だけ行う。
 * 以前はフルサイズでデコードしてから縮小しており、iPhone の 12MP 写真で時間とメモリを二重に使っていた。
 * EXIF の回転は <img> も createImageBitmap も既定で適用するので、アプリ側では回転しない。
 */
export async function importImage(
  file: File,
  outputWidth: number,
  outputHeight: number,
): Promise<ImportedImage> {
  const original = await readImageSize(file)
  const maxLongSide = Math.max(outputWidth, outputHeight) * PHOTO_SCALE_FACTOR
  const scale = Math.min(1, maxLongSide / Math.max(original.width, original.height))
  const width = Math.round(original.width * scale)
  const height = Math.round(original.height * scale)

  let bitmap: ImageBitmap
  try {
    bitmap =
      scale < 1
        ? await createImageBitmap(file, {
            resizeWidth: width,
            resizeHeight: height,
            resizeQuality: 'medium',
          })
        : await createImageBitmap(file)
  } catch {
    throw new MediaError('この写真は読み込めませんでした。JPEG または PNG を選んでください。')
  }

  // 縮小指定に対応していないブラウザはフルサイズを返すので、そのときだけ Canvas で縮小する
  if (bitmap.width > width || bitmap.height > height) {
    bitmap = await shrinkWithCanvas(bitmap, width, height)
  }

  return {
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    originalWidth: original.width,
    originalHeight: original.height,
  }
}

/** <img> に読ませて寸法だけ取る。load の時点ではヘッダーしか読まないので速い */
function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      const isHeic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/.test(file.type)
      reject(
        new MediaError(
          isHeic
            ? 'この端末では HEIC の写真を読めません。JPEG で撮り直すか、PC で変換してください。'
            : 'この写真は読み込めませんでした。JPEG または PNG を選んでください。',
        ),
      )
    }
    img.src = url
  })
}

async function shrinkWithCanvas(
  full: ImageBitmap,
  width: number,
  height: number,
): Promise<ImageBitmap> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new MediaError('Canvas を作れませんでした。')
    ctx.drawImage(full, 0, 0, width, height)
    return await createImageBitmap(canvas)
  } finally {
    full.close()
  }
}
