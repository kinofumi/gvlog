import { describe, expect, it } from 'vitest'
import { clampTrimStart, maxTrimStart, sourceFrameAt } from './trim'

describe('sourceFrameAt（出力フレーム → 元動画のフレーム）', () => {
  it('見え始めた瞬間が trimStart で、1 フレームごとに 1 進む', () => {
    expect(sourceFrameAt(0, 100, 100)).toBe(0)
    expect(sourceFrameAt(45, 100, 100)).toBe(45)
    expect(sourceFrameAt(45, 100, 130)).toBe(75)
  })
})

describe('maxTrimStart（トリムの上限 = 元動画の尺 − 見える長さ）', () => {
  it('元動画が見える長さより長い分だけ動かせる', () => {
    expect(maxTrimStart(300, 100)).toBe(200)
  })

  it('元動画が見える長さ以下なら 0（末尾はホールドされる）', () => {
    expect(maxTrimStart(100, 100)).toBe(0)
    expect(maxTrimStart(50, 100)).toBe(0)
  })
})

describe('clampTrimStart（0〜上限の整数に収める）', () => {
  it('範囲内はそのまま', () => {
    expect(clampTrimStart(30, 300, 100)).toBe(30)
  })

  it('上限を超えたら上限、負なら 0', () => {
    expect(clampTrimStart(250, 300, 100)).toBe(200)
    expect(clampTrimStart(-5, 300, 100)).toBe(0)
  })

  it('非整数は切り捨て、NaN は 0', () => {
    expect(clampTrimStart(10.9, 300, 100)).toBe(10)
    expect(clampTrimStart(Number.NaN, 300, 100)).toBe(0)
  })
})
