import { canEncodeAudio } from 'mediabunny'
import { BGM_FADE_OUT_SEC, loopedChunk } from './loop'

/** デコードするサンプルレート。AAC の標準で、どの端末でもエンコードできる */
export const BGM_SAMPLE_RATE = 44100

/** 書き出しが BGM について知る必要のあること（AudioBuffer は exportVideo のテストでは作れないので、ここで包む） */
export type BgmProvider = {
  sampleRate: number
  numberOfChannels: number
  /** 出力の [startSample, startSample + length) の音（ループとフェードアウト済み） */
  chunk(startSample: number, length: number): AudioBuffer
}

/** この端末で BGM 付きの MP4（AAC）を作れるか。iPhone は iOS 26 以降（WebCodecs の AudioEncoder） */
export function canEncodeBgm(): Promise<boolean> {
  return canEncodeAudio('aac', { numberOfChannels: 1, sampleRate: BGM_SAMPLE_RATE })
}

/** 曲のファイルを取ってきてデコードする（MP3 など、ブラウザが再生できる形式なら何でも） */
export async function loadBgm(url: string, signal?: AbortSignal): Promise<AudioBuffer> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`BGM を読み込めませんでした（${response.status}）。`)
  const data = await response.arrayBuffer()
  // 再生用の AudioContext を作らずにデコードだけする（端末の音声出力を占有しない）
  const context = new OfflineAudioContext(1, 1, BGM_SAMPLE_RATE)
  return context.decodeAudioData(data)
}

/** デコードした曲から、出力の長さ（totalSamples）に合わせた BgmProvider を作る */
export function createBgmProvider(song: AudioBuffer, totalSamples: number): BgmProvider {
  const channels = Array.from({ length: song.numberOfChannels }, (_, c) => song.getChannelData(c))
  const fadeSamples = Math.round(BGM_FADE_OUT_SEC * song.sampleRate)
  return {
    sampleRate: song.sampleRate,
    numberOfChannels: song.numberOfChannels,
    chunk(startSample, length) {
      const buffer = new AudioBuffer({
        length,
        sampleRate: song.sampleRate,
        numberOfChannels: song.numberOfChannels,
      })
      channels.forEach((data, c) => {
        buffer
          .getChannelData(c)
          .set(loopedChunk(data, startSample, length, totalSamples, fadeSamples))
      })
      return buffer
    },
  }
}
