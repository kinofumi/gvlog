import type { ImportedVideo } from '../media/importVideo'
import type { MediaItem } from '../model/types'
import type { CompiledItem } from '../timeline/compile'
import type { FrameSource } from './frameSource'

/** 動画 1 本分のデコーダを作る関数。実物は VideoFrameSource、テストではフェイク */
export type MakeFrameSource = (
  video: ImportedVideo,
  visibleStart: number,
  visibleEnd: number,
  trimStartFrames: number,
) => FrameSource

/**
 * 動画素材ごとにデコーダ（FrameSource）を作る。見える区間は compiled から取る。
 * 動画の実体が無い素材は分かるエラーにする。途中で失敗したら、それまでに作った分を解放してから投げる。
 */
export async function createVideoSources(
  compiled: CompiledItem[],
  items: MediaItem[],
  videos: Record<string, ImportedVideo>,
  make: MakeFrameSource,
): Promise<Map<string, FrameSource>> {
  const sources = new Map<string, FrameSource>()
  try {
    items.forEach((item, i) => {
      if (item.kind !== 'video') return
      const video = videos[item.itemId]
      if (!video) throw new Error(`動画 ${item.fileName} のデータがありません。`)
      const { visibleStart, visibleEnd } = compiled[i]
      sources.set(item.itemId, make(video, visibleStart, visibleEnd, item.trimStartFrames))
    })
  } catch (error) {
    await Promise.allSettled([...sources.values()].map((s) => s.dispose()))
    throw error
  }
  return sources
}
