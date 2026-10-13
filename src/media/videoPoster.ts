import { CanvasSink } from 'mediabunny'
import { MediaError } from './errors'
import type { ImportedVideo } from './importVideo'

/**
 * 動画の先頭フレームをポスター画像にする。サムネイルと、プレビューで <video> が用意できるまでの代わりに使う。
 * CanvasSink が回転と cover フィットを済ませるので、書き出しの画と同じ切り出しになる。
 */
export async function makeVideoPoster(
  video: ImportedVideo,
  width: number,
  height: number,
): Promise<ImageBitmap> {
  const sink = new CanvasSink(video.track, { width, height, fit: 'cover', poolSize: 1 })
  const first = await sink.getCanvas(video.firstTimestampSec)
  if (!first) throw new MediaError('動画の先頭フレームを取り出せませんでした。')
  return createImageBitmap(first.canvas)
}
