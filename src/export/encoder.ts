import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
} from 'mediabunny'
import { EXPORT_BITRATE, type EncoderChoice } from './codec'

/**
 * 書き出しループが使うエンコーダの最小の interface。
 * 実物は mediabunny（下の createMp4Encoder）。テストではフェイクを渡す（plan §11）。
 */
export interface FrameEncoder {
  start(): Promise<void>
  /** キャンバスの今の内容を、その時刻のフレームとしてエンコードする */
  add(timeSec: number, durationSec: number): Promise<void>
  /** BGM の音を続きとしてエンコードする（音声トラック付きで作ったときだけ。無ければ失敗する） */
  addAudio(buffer: AudioBuffer): Promise<void>
  /** 終了して MP4 を返す */
  finalize(): Promise<Blob>
  /** 途中でやめる。finalize 済みなら何もしない。解放に失敗したら投げる（呼び出し側が元の失敗と併記する） */
  cancel(): Promise<void>
  /** 実際に使われたコーデック文字列（失敗時の表示用） */
  usedCodecString(): string
}

/** 音声トラックの形（BGM のサンプルレートとチャンネル数）。null なら無音の MP4 */
export type AudioSpec = { sampleRate: number; numberOfChannels: number } | null

/** mediabunny で Canvas から H.264 / MP4 を作るエンコーダ。audio があれば AAC の音声トラックも付ける（ADR 019） */
export function createMp4Encoder(
  canvas: HTMLCanvasElement,
  fps: number,
  choice: EncoderChoice,
  audio: AudioSpec = null,
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
  // 音声は AudioBuffer を順に渡すだけ（最初のものが 0 秒、あとは続き）。AAC は MP4 と写真アプリの標準
  const audioSource = audio
    ? new AudioBufferSource({ codec: 'aac', quality: new Quality('medium') })
    : null
  if (audioSource) output.addAudioTrack(audioSource)

  return {
    start: () => output.start(),
    add: (timeSec, durationSec) => source.add(timeSec, durationSec),
    addAudio: (buffer) => {
      if (!audioSource) throw new Error('音声トラックの無い書き出しに BGM を渡しました。')
      return audioSource.add(buffer)
    },
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
