import type { ImportedVideo } from '../media/importVideo'
import type { MediaItem } from '../model/types'
import type { CompiledItem } from '../timeline/compile'
import { VideoFrameSource, type FrameSource } from './frameSource'

/**
 * 動画素材ごとにデコーダ（VideoFrameSource）を作る。見える区間は compiled から取る。
 * 動画の実体が無い素材（取り込み直後に外れたなど）は飛ばさず、分かるエラーにする。
 */
export function createVideoSources(
  compiled: CompiledItem[],
  items: MediaItem[],
  videos: Record<string, ImportedVideo>,
  fps: number,
  outputWidth: number,
  outputHeight: number,
): Map<string, FrameSource> {
  const sources = new Map<string, FrameSource>()
  items.forEach((item, i) => {
    if (item.kind !== 'video') return
    const video = videos[item.itemId]
    if (!video) throw new Error(`動画 ${item.fileName} のデータがありません。`)
    const { visibleStart, visibleEnd } = compiled[i]
    sources.set(
      item.itemId,
      new VideoFrameSource(
        video,
        visibleStart,
        visibleEnd,
        item.trimStartFrames,
        fps,
        outputWidth,
        outputHeight,
      ),
    )
  })
  return sources
}
