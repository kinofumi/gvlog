import { describe, expect, it } from 'vitest'
import { clampAfterResize, clampCaptionOffsets, clampTransition } from './clamp'

describe('clampTransition（トランジション長の上限）', () => {
  it('前後の短い方の尺の半分まで', () => {
    expect(clampTransition(100, 60, 240)).toBe(30)
    expect(clampTransition(100, 240, 60)).toBe(30)
  })

  it('上限に収まっていればそのまま', () => {
    expect(clampTransition(10, 150, 150)).toBe(10)
  })

  it('奇数の尺は切り捨て', () => {
    expect(clampTransition(100, 31, 300)).toBe(15)
  })

  it('負の値は 0 にする', () => {
    expect(clampTransition(-5, 150, 150)).toBe(0)
  })
})

describe('clampCaptionOffsets（キャプションの開始遅れ・終了早めを尺に収める）', () => {
  it('収まっていればそのまま', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: 10, outOffsetFrames: 20 }, 150)).toEqual({
      inOffsetFrames: 10,
      outOffsetFrames: 20,
    })
  })

  it('合計が尺を超えたら終了早めを削って合計を尺に収める', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: 100, outOffsetFrames: 100 }, 150)).toEqual({
      inOffsetFrames: 100,
      outOffsetFrames: 50,
    })
  })

  it('開始遅れが尺を超えたら尺に丸め、終了早めは 0', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: 200, outOffsetFrames: 10 }, 150)).toEqual({
      inOffsetFrames: 150,
      outOffsetFrames: 0,
    })
  })

  it('負の値は 0 にする', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: -5, outOffsetFrames: -5 }, 150)).toEqual({
      inOffsetFrames: 0,
      outOffsetFrames: 0,
    })
  })
})

describe('clampAfterResize（尺を変えたあとの整合）', () => {
  it('隣接するトランジションとキャプションのオフセットを切り詰める', () => {
    const items = [
      {
        itemId: 'a',
        durationFrames: 40,
        transitionOut: { type: 'crossfade' as const, durationFrames: 30 },
        caption: { inOffsetFrames: 30, outOffsetFrames: 30 },
      },
      { itemId: 'b', durationFrames: 260 },
    ]
    expect(clampAfterResize(items)).toEqual([
      {
        itemId: 'a',
        durationFrames: 40,
        transitionOut: { type: 'crossfade', durationFrames: 20 },
        caption: { inOffsetFrames: 30, outOffsetFrames: 10 },
      },
      { itemId: 'b', durationFrames: 260 },
    ])
  })

  it('末尾の素材の transitionOut は 0 にする', () => {
    const items = [
      {
        itemId: 'a',
        durationFrames: 300,
        transitionOut: { type: 'crossfade' as const, durationFrames: 10 },
      },
    ]
    expect(clampAfterResize(items)[0].transitionOut).toEqual({
      type: 'crossfade',
      durationFrames: 0,
    })
  })

  it('元の配列と要素は変更しない', () => {
    const items = [
      {
        itemId: 'a',
        durationFrames: 40,
        transitionOut: { type: 'crossfade' as const, durationFrames: 30 },
      },
      { itemId: 'b', durationFrames: 260 },
    ]
    clampAfterResize(items)
    expect(items[0].transitionOut?.durationFrames).toBe(30)
  })
})
