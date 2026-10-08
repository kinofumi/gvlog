import { CanvasSink, type WrappedCanvas } from 'mediabunny'
import type { ImportedVideo } from '../media/importVideo'
import type { Segment } from '../timeline/compile'

/**
 * 書き出しのとき、各フレームで描く画像を用意する役。
 * デコードは非同期なので prepare() で待ち、get() は同期で必ず画像を返す。
 * 所有している資源（デコーダ、ビットマップ）は dispose() で解放する。
 */
export interface FrameSource {
  prepare(frame: number): Promise<void>
  get(): CanvasImageSource
  width(): number
  height(): number
  dispose(): void
}

/** 写真: 常に同じビットマップを返す */
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

  dispose(): void {
    this.bitmap.close()
  }
}

/**
 * 動画: 必要な区間を先頭から順にデコードし、目標時刻以下で最新のフレームを返す。
 * CanvasSink が回転と cover フィットを済ませた Canvas を返すので、アプリ側で回転しない。
 * 区間が元動画より長いときは最後のフレームをホールドする。
 */
export class VideoFrameSource implements FrameSource {
  private readonly segment: Segment
  private readonly fps: number
  private readonly trimStartSec: number
  private readonly sink: CanvasSink
  private readonly outputWidth: number
  private readonly outputHeight: number
  private iterator: AsyncGenerator<WrappedCanvas, void, unknown> | null = null
  private current: WrappedCanvas | null = null
  private next: WrappedCanvas | null = null
  private finished = false

  constructor(
    video: ImportedVideo,
    segment: Segment,
    fps: number,
    trimStartSec: number,
    outputWidth: number,
    outputHeight: number,
  ) {
    this.segment = segment
    this.fps = fps
    this.trimStartSec = trimStartSec
    this.outputWidth = outputWidth
    this.outputHeight = outputHeight
    // poolSize 2: current と next の 2 枚があれば足りる
    this.sink = new CanvasSink(video.track, {
      width: outputWidth,
      height: outputHeight,
      fit: 'cover',
      poolSize: 2,
    })
  }

  async prepare(frame: number): Promise<void> {
    // 素材内の時刻: 見え始めた瞬間を 0 とする
    const targetSec = this.trimStartSec + (frame - this.segment.start) / this.fps

    if (!this.iterator) {
      const endSec = this.trimStartSec + (this.segment.end - this.segment.start) / this.fps
      this.iterator = this.sink.canvases(this.trimStartSec, endSec + 1)
      this.next = await this.pull()
    }

    // next の時刻が目標以下のあいだ、current を進める
    while (this.next && this.next.timestamp <= targetSec) {
      this.current = this.next
      this.next = await this.pull()
    }

    if (!this.current) {
      // 目標時刻より前のフレームがまだ無い（動画の先頭より前を要求した）ときは next を使う
      if (this.next) {
        this.current = this.next
        this.next = await this.pull()
      } else {
        throw new Error('動画のフレームを取り出せませんでした。')
      }
    }
  }

  private async pull(): Promise<WrappedCanvas | null> {
    if (this.finished || !this.iterator) return null
    const result = await this.iterator.next()
    if (result.done) {
      this.finished = true
      return null
    }
    return result.value
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

  dispose(): void {
    void this.iterator?.return()
    this.iterator = null
    this.current = null
    this.next = null
  }
}
