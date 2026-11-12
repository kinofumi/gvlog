import { canEncodeAudio } from 'mediabunny'
import { BGM_FADE_OUT_SEC, loopedChunk, mixToMono } from './loop'

/** デコードするサンプルレート。AAC の標準で、どの端末でもエンコードできる */
export const BGM_SAMPLE_RATE = 44100

/** 書き出しが BGM について知る必要のあること（AudioBuffer は exportVideo のテストでは作れないので、ここで包む）。BGM はモノラル */
export type BgmProvider = {
  sampleRate: number
  /** 出力の長さ（サンプル数）。chunk はこの範囲を切り出し、末尾のフェードアウトもこの長さに合わせる */
  totalSamples: number
  /** 出力の [startSample, startSample + length) の音（ループとフェードアウト済み） */
  chunk(startSample: number, length: number): AudioBuffer
}

/** この端末で BGM 付きの MP4（AAC、モノラル）を作れるか。iPhone は iOS 26 以降（WebCodecs の AudioEncoder） */
export function canEncodeBgm(): Promise<boolean> {
  return canEncodeAudio('aac', { numberOfChannels: 1, sampleRate: BGM_SAMPLE_RATE })
}

/**
 * 曲のファイルを取ってきてデコードし、1 チャンネル（モノラル）の PCM にする。MP3 など、ブラウザが再生できる形式なら何でも。
 * decodeAudioData はチャンネル数を変えない（ステレオはステレオのまま）ので、ここで平均する。
 */
export async function loadBgm(url: string, signal?: AbortSignal): Promise<Float32Array> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`BGM を読み込めませんでした（${response.status}）。`)
  const data = await response.arrayBuffer()
  // 再生用の AudioContext を作らずにデコードだけする（端末の音声出力を占有しない）
  const context = new OfflineAudioContext(1, 1, BGM_SAMPLE_RATE)
  const decoded = await context.decodeAudioData(data)
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, c) =>
    decoded.getChannelData(c),
  )
  return mixToMono(channels)
}

/** デコードした曲（モノラル、BGM_SAMPLE_RATE）から、出力の長さ（totalSamples）に合わせた BgmProvider を作る */
export function createBgmProvider(song: Float32Array, totalSamples: number): BgmProvider {
  const fadeSamples = Math.round(BGM_FADE_OUT_SEC * BGM_SAMPLE_RATE)
  return {
    sampleRate: BGM_SAMPLE_RATE,
    totalSamples,
    chunk(startSample, length) {
      const buffer = new AudioBuffer({ length, sampleRate: BGM_SAMPLE_RATE, numberOfChannels: 1 })
      buffer
        .getChannelData(0)
        .set(loopedChunk(song, startSample, length, totalSamples, fadeSamples))
      return buffer
    },
  }
}
