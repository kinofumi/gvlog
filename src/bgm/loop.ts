// BGM の純粋な部分（ADR 019）。曲（PCM のサンプル列）を出力の長さまでループさせ、末尾をフェードアウトする。
// ブラウザ API（AudioBuffer、デコード）には触らない。それは bgmAudio.ts。

/** 末尾のフェードアウトの長さ（秒）。曲の途中で切れても耳障りにならない程度 */
export const BGM_FADE_OUT_SEC = 2

/** 出力の長さ（フレーム数）を音のサンプル数にする（動画とぴったり同じ長さにするため） */
export function totalSamplesFor(totalFrames: number, fps: number, sampleRate: number): number {
  return Math.round((totalFrames / fps) * sampleRate)
}

/**
 * 出力の index 番目のサンプルに掛ける音量。末尾 fadeSamples の間で 1 から 0 へ直線で下げる。
 * フェードが全体より長いときは最初から下がり始める。
 */
export function fadeGain(index: number, totalSamples: number, fadeSamples: number): number {
  const fadeStart = Math.max(0, totalSamples - fadeSamples)
  if (index < fadeStart) return 1
  const span = Math.max(1, totalSamples - fadeStart)
  return Math.max(0, (totalSamples - index) / span)
}

/**
 * 出力の [start, start + length) サンプル分を、曲 song（1 チャンネル分）をループさせて切り出す。
 * 音量は fadeGain。曲が空なら無音。
 */
export function loopedChunk(
  song: Float32Array,
  start: number,
  length: number,
  totalSamples: number,
  fadeSamples: number,
): Float32Array {
  const out = new Float32Array(Math.max(0, length))
  if (song.length === 0) return out
  for (let i = 0; i < out.length; i++) {
    const position = start + i
    out[i] = song[position % song.length] * fadeGain(position, totalSamples, fadeSamples)
  }
  return out
}
