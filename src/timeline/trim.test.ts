import { describe, expect, it } from 'vitest'
import type { MediaItem, VideoItem } from '../model/types'
import { clampTrimStart, clampTrims, maxTrimStart, sourceFrameAt } from './trim'

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

describe('clampTrims（素材の並び全体で開始位置を上限内に収める）', () => {
  const video = (itemId: string, durationFrames: number, trimStartFrames: number): VideoItem => ({
    itemId,
    kind: 'video',
    blobKey: itemId,
    thumbKey: itemId,
    fileName: `${itemId}.mov`,
    width: 1080,
    height: 1920,
    durationFrames,
    sourceDurationFrames: 300,
    trimStartFrames,
  })

  it('上限内の素材は同じオブジェクトのまま、超えた素材だけ切り詰める', () => {
    const items: MediaItem[] = [video('a', 150, 100), video('b', 150, 200)]
    const result = clampTrims(items)
    expect(result[0]).toBe(items[0])
    expect((result[1] as VideoItem).trimStartFrames).toBe(150)
  })

  it('クロスフェードで見える長さが延びた分だけ上限が縮む', () => {
    const items: MediaItem[] = [
      { ...video('a', 150, 0), transitionOut: { type: 'crossfade', durationFrames: 30 } },
      video('b', 150, 150),
    ]
    // b は 15 フレーム早く見え始める → 見える長さ 165、上限 135
    expect((clampTrims(items)[1] as VideoItem).trimStartFrames).toBe(135)
  })
})
