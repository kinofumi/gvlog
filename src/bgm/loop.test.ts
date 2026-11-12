import { describe, expect, it } from 'vitest'
import { BGM_FADE_OUT_SEC, fadeGain, loopedChunk, mixToMono, totalSamplesFor } from './loop'

describe('totalSamplesFor（出力の長さをサンプル数に）', () => {
  it('フレーム数と fps とサンプルレートから、動画と同じ長さのサンプル数を出す', () => {
    expect(totalSamplesFor(450, 30, 44100)).toBe(661500) // 15 秒
    expect(totalSamplesFor(1, 30, 44100)).toBe(1470)
  })
})

describe('fadeGain（末尾のフェードアウトの音量）', () => {
  it('フェードに入る前は 1', () => {
    expect(fadeGain(0, 1000, 100)).toBe(1)
    expect(fadeGain(899, 1000, 100)).toBe(1)
  })

  it('末尾に向かって直線で 1 から 0 に下がり、最後のサンプルはほぼ 0', () => {
    expect(fadeGain(900, 1000, 100)).toBe(1)
    expect(fadeGain(950, 1000, 100)).toBeCloseTo(0.5)
    expect(fadeGain(999, 1000, 100)).toBeCloseTo(0.01)
  })

  it('フェードが全体より長ければ、最初から下がり始める', () => {
    expect(fadeGain(0, 100, 1000)).toBe(1)
    expect(fadeGain(50, 100, 1000)).toBeCloseTo(0.5)
  })

  it('既定のフェードは 2 秒', () => {
    expect(BGM_FADE_OUT_SEC).toBe(2)
  })
})

describe('loopedChunk（曲をループさせて出力の一部を切り出す）', () => {
  // 4 サンプルの短い曲
  const song = new Float32Array([0.1, 0.2, 0.3, 0.4])

  it('曲の中なら、そのままの並び', () => {
    expect(Array.from(loopedChunk(song, 0, 3, 100, 0))).toEqual(Array.from(song.subarray(0, 3)))
  })

  it('曲の終わりを越えたら先頭に戻って続く（ループ）', () => {
    expect(Array.from(loopedChunk(song, 2, 6, 100, 0)).map((v) => Number(v.toFixed(1)))).toEqual([
      0.3, 0.4, 0.1, 0.2, 0.3, 0.4,
    ])
  })

  it('出力の末尾ではフェードアウトの音量が掛かる', () => {
    // 全体 8 サンプル、フェード 4 サンプル。位置 4〜7 で 1, 0.75, 0.5, 0.25
    const chunk = loopedChunk(song, 4, 4, 8, 4)
    expect(Array.from(chunk).map((v) => Number(v.toFixed(3)))).toEqual([0.1, 0.15, 0.15, 0.1])
  })

  it('長さ 0 なら空', () => {
    expect(loopedChunk(song, 0, 0, 100, 0)).toHaveLength(0)
  })

  it('曲が空なら無音', () => {
    expect(Array.from(loopedChunk(new Float32Array(0), 0, 3, 100, 0))).toEqual([0, 0, 0])
  })
})

describe('mixToMono（ステレオの曲を 1 チャンネルに）', () => {
  it('左右の平均にする', () => {
    const left = new Float32Array([1, 0, 0.5])
    const right = new Float32Array([0, 0, 0.5])
    expect(Array.from(mixToMono([left, right]))).toEqual([0.5, 0, 0.5])
  })

  it('もともと 1 チャンネルならそのまま', () => {
    const mono = new Float32Array([0.1, 0.2])
    expect(mixToMono([mono])).toBe(mono)
  })
})
