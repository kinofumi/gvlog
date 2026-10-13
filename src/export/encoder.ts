import { BufferTarget, CanvasSource, Mp4OutputFormat, Output } from 'mediabunny'
import { EXPORT_BITRATE, type EncoderChoice } from './codec'

/**
 * 書き出しループが使うエンコーダの最小の interface。
 * 実物は mediabunny（下の createMp4Encoder）。テストではフェイクを渡す（plan §11）。
 */
export interface FrameEncoder {
  start(): Promise<void>
  /** キャンバスの今の内容を、その時刻のフレームとしてエンコードする */
  add(timeSec: number, durationSec: number): Promise<void>
  /** 終了して MP4 を返す */
  finalize(): Promise<Blob>
  /** 途中でやめる。finalize 済みなら何もしない。解放に失敗したら投げる（呼び出し側が元の失敗と併記する） */
  cancel(): Promise<void>
  /** 実際に使われたコーデック文字列（失敗時の表示用） */
  usedCodecString(): string
}

/** mediabunny で Canvas から H.264 / MP4 を作るエンコーダ */
export function createMp4Encoder(
  canvas: HTMLCanvasElement,
  fps: number,
  choice: EncoderChoice,
): FrameEncoder {
  let usedCodec = choice.fullCodecString ?? '(auto)'
  let finalized = false
  const target = new BufferTarget()
  const output = new Output({ format: new Mp4OutputFormat(), target })
  const source = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: EXPORT_BITRATE,
    keyFrameInterval: 1,
    latencyMode: choice.latencyMode,
    fullCodecString: choice.fullCodecString,
    onEncoderConfig: (config) => {
      usedCodec = config.codec
    },
  })
  output.addVideoTrack(source, { frameRate: fps })

  return {
    start: () => output.start(),
    add: (timeSec, durationSec) => source.add(timeSec, durationSec),
    finalize: async () => {
      await output.finalize()
      finalized = true
      if (!target.buffer) throw new Error('書き出し結果が空でした。')
      return new Blob([target.buffer as BlobPart], { type: 'video/mp4' })
    },
    cancel: async () => {
      if (finalized) return
      await output.cancel()
    },
    usedCodecString: () => usedCodec,
  }
}
