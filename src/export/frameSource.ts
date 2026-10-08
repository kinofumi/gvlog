import { CanvasSink, type WrappedCanvas } from 'mediabunny'
import type { ImportedVideo } from '../media/importVideo'
import type { Segment } from '../timeline/compile'

/**
 * 書き出しのとき、各フレームで描く画像を用意する役。
 * デコードは非同期なので prepare() で待ち、get() は同期で必ず画像を返す。
 * prepare() は区間の先頭から 1 フレームずつ順に呼ぶこと（飛ばし読みはしない）。
 * 自分で作った資源（デコーダ）は dispose() で解放する。呼び出し側から受け取った資源は解放しない。
 * dispose() は解放が終わるまで待てるよう Promise を返す。
 */
export interface FrameSource {
  prepare(frame: number): Promise<void>
  get(): CanvasImageSource
  width(): number
  height(): number
  dispose(): Promise<void>
}

/**
 * 写真: 常に同じビットマップを返す。
 * ビットマップの持ち主は呼び出し側（画面の状態）なので、ここでは close しない。
 * 書き出しのたびに閉じてしまうと、2 回目の書き出しで描けなくなる。
 */
export class PhotoFrameSource implements FrameSource {
  private readonly bitmap: ImageBitmap

  constructor(bitmap: ImageBitmap) {
    this.bitmap = bitmap
  }

  async prepare(): Promise<void> {}

  get(): CanvasImageSource {
    return this.bitmap
  }

  width(): number {
    return this.bitmap.width
  }

  height(): number {
    return this.bitmap.height
  }

  async dispose(): Promise<void> {}
}

/**
 * 動画: 区間の各フレームに対応する元動画の時刻を先に並べ、
 * mediabunny の canvasesAtTimestamps() に渡して順にデコードしてもらう。
 * 「その時刻以下で最新のフレーム」の選択と、末尾フレームのホールドはライブラリがやる。
 * CanvasSink が回転と cover フィットも済ませるので、アプリ側で回転しない。
 */
export class VideoFrameSource implements FrameSource {
  private readonly sink: CanvasSink
  private readonly outputWidth: number
  private readonly outputHeight: number
  private readonly frames: AsyncGenerator<WrappedCanvas | null, void, unknown>
  private current: WrappedCanvas | null = null

  constructor(
    video: ImportedVideo,
    segment: Segment,
    fps: number,
    trimStartSec: number,
    outputWidth: number,
    outputHeight: number,
  ) {
    this.outputWidth = outputWidth
    this.outputHeight = outputHeight
    this.sink = new CanvasSink(video.track, {
      width: outputWidth,
      height: outputHeight,
      fit: 'cover',
      poolSize: 2,
    })

    // 素材内の時刻: 動画の先頭フレームの時刻（0 とは限らない）を基準に、
    // 見え始めた瞬間を trimStartSec とし、1 フレームずつ進める
    const timestamps: number[] = []
    for (let frame = segment.start; frame < segment.end; frame++) {
      timestamps.push(video.firstTimestampSec + trimStartSec + (frame - segment.start) / fps)
    }
    this.frames = this.sink.canvasesAtTimestamps(timestamps)
  }

  async prepare(frame: number): Promise<void> {
    const result = await this.frames.next()
    if (result.done || result.value === null) {
      throw new Error(`動画のフレーム（${frame}）を取り出せませんでした。`)
    }
    this.current = result.value
  }

  get(): CanvasImageSource {
    if (!this.current) throw new Error('prepare() を先に呼んでください。')
    return this.current.canvas
  }

  width(): number {
    return this.outputWidth
  }

  height(): number {
    return this.outputHeight
  }

  async dispose(): Promise<void> {
    this.current = null
    // デコーダの終了を待ってから戻る（待たないと次の書き出しと重なる）
    await this.frames.return()
  }
}
