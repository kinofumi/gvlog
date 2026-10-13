import type { ImageProvider, ProvidedImage } from '../render/renderFrame'
import { itemsAt, type CompiledItem } from '../timeline/compile'
import type { FrameSource } from './frameSource'

/**
 * 書き出しのとき renderFrame に画像を渡す役。
 * 写真は取り込み済みの画像をそのまま、動画は FrameSource（デコーダ）から取る。
 * フレームごとに、そのフレームで見える動画だけ prepare() する。
 */
export interface ExportFrameProvider extends ImageProvider {
  /** そのフレームで見える素材の画像を用意する（デコードを待つ） */
  prepare(frame: number): Promise<void>
  /** 自分で作った資源（デコーダ）を解放する。写真の画像は持ち主（画面）のものなので閉じない */
  dispose(): Promise<void>
}

export function createFrameProvider(
  compiled: CompiledItem[],
  photos: Record<string, ProvidedImage>,
  videos: Map<string, FrameSource>,
): ExportFrameProvider {
  return {
    async prepare(frame) {
      for (const item of itemsAt(compiled, frame)) {
        const source = videos.get(item.itemId)
        if (source) await source.prepare(frame)
      }
    },
    get(itemId) {
      const source = videos.get(itemId)
      if (source) return { image: source.get(), width: source.width(), height: source.height() }
      const photo = photos[itemId]
      if (!photo) throw new Error(`素材 ${itemId} の画像がありません。`)
      return photo
    },
    async dispose() {
      // 1 つが失敗しても残りの解放を続け、失敗はまとめて投げる
      const results = await Promise.allSettled([...videos.values()].map((s) => s.dispose()))
      const failures = results.filter((r) => r.status === 'rejected')
      if (failures.length > 0) {
        throw new Error(`デコーダの解放に ${failures.length} 件失敗しました。`, {
          cause: failures[0],
        })
      }
    },
  }
}
