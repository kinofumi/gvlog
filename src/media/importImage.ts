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
 * 寸法は <img> の load で読み、デコードは縮小指定付きの createImageBitmap で行う。
 * 以前はフルサイズでデコードしてから縮小しており、iPhone の 12MP 写真でもたついた。
 * この形にして iPhone（iOS 18.7）で体感で速くなった（<img> がいつデコードするかはブラウザ次第で、
 * 「デコードは 1 回」と仕様で保証されているわけではない）。
 * EXIF の回転は <img> も createImageBitmap も既定で適用する（対象は Safari 16.4 以上、plan §要件）ので、
 * アプリ側では回転しない。
 */
export async function importImage(
  file: File,
  outputWidth: number,
  outputHeight: number,
): Promise<ImportedImage> {
  const img = await loadImageElement(file)
  const original = { width: img.naturalWidth, height: img.naturalHeight }
  if (original.width === 0 || original.height === 0) {
    // 固有の寸法を持たない画像（SVG など）。0 で割ると先の計算が壊れるのでここで止める
    throw new MediaError('この写真は読み込めませんでした。JPEG または PNG を選んでください。')
  }
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
            // 出力の 2 倍の大きさに縮めるので medium で足りる。high は Chrome で目に見えて遅い
            resizeQuality: 'medium',
          })
        : await createImageBitmap(file)
  } catch {
    throw new MediaError('この写真は読み込めませんでした。JPEG または PNG を選んでください。')
  }

  // 保険: createImageBitmap が縮小や EXIF の回転を期待どおりに適用しなかったとき（フルサイズのまま、
  // または縦横比が <img> の寸法と食い違う）は、<img> から Canvas で縮小して向きと寸法を揃える。
  // 対象ブラウザ（Safari 16.4 以上、Chrome）では通らない想定で、通ったら support-matrix に記録する。
  const expectedRatio = original.width / original.height
  const actualRatio = bitmap.width / bitmap.height
  const mismatched = Math.abs(actualRatio - expectedRatio) > 0.01
  if (bitmap.width > width || bitmap.height > height || mismatched) {
    bitmap.close()
    bitmap = await shrinkWithCanvas(img, width, height)
  }

  return {
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    originalWidth: original.width,
    originalHeight: original.height,
  }
}

/** <img> に読ませる。寸法（EXIF 回転適用後）が取れ、保険の縮小にも使う。Object URL は必ず解放する */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
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
  img: HTMLImageElement,
  width: number,
  height: number,
): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new MediaError('Canvas を作れませんでした。')
  ctx.drawImage(img, 0, 0, width, height)
  return createImageBitmap(canvas)
}
