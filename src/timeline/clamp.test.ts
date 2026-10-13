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

  it('非整数は切り捨て、NaN は 0、Infinity は上限で止める', () => {
    expect(clampTransition(9.5, 150, 150)).toBe(9)
    expect(clampTransition(Number.NaN, 150, 150)).toBe(0)
    expect(clampTransition(Number.POSITIVE_INFINITY, 150, 150)).toBe(75)
  })
})

describe('clampCaptionOffsets（キャプションの開始遅れ・終了早めを尺に収める）', () => {
  it('収まっていればそのまま', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: 10, outOffsetFrames: 20 }, 150)).toEqual({
      inOffsetFrames: 10,
      outOffsetFrames: 20,
    })
  })

  it('表示区間が最低 16 フレーム残るように、終了早めから削る', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: 100, outOffsetFrames: 100 }, 150)).toEqual({
      inOffsetFrames: 100,
      outOffsetFrames: 34,
    })
  })

  it('開始遅れが大きすぎるときは、表示区間 16 フレームを残す位置まで戻し、終了早めは 0', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: 200, outOffsetFrames: 10 }, 150)).toEqual({
      inOffsetFrames: 134,
      outOffsetFrames: 0,
    })
  })

  it('素材の尺が 16 フレームより短ければ、全部を表示区間にする', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: 5, outOffsetFrames: 5 }, 10)).toEqual({
      inOffsetFrames: 0,
      outOffsetFrames: 0,
    })
  })

  it('負の値は 0 にする', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: -5, outOffsetFrames: -5 }, 150)).toEqual({
      inOffsetFrames: 0,
      outOffsetFrames: 0,
    })
  })

  it('非整数は切り捨て、NaN は 0 にする', () => {
    expect(clampCaptionOffsets({ inOffsetFrames: 10.9, outOffsetFrames: Number.NaN }, 150)).toEqual(
      {
        inOffsetFrames: 10,
        outOffsetFrames: 0,
      },
    )
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
        // 40 フレームのうち 16 を表示に残すので、開始遅れは 24 まで、終了早めは 0
        caption: { inOffsetFrames: 24, outOffsetFrames: 0 },
      },
      { itemId: 'b', durationFrames: 260 },
    ])
  })

  it('末尾の素材の transitionOut は触らない（無視するのは compile 側。あとで素材を足したときに残す）', () => {
    const items = [
      {
        itemId: 'a',
        durationFrames: 300,
        transitionOut: { type: 'crossfade' as const, durationFrames: 10 },
      },
    ]
    expect(clampAfterResize(items)[0].transitionOut).toEqual({
      type: 'crossfade',
      durationFrames: 10,
    })
  })

  it('cut の durationFrames は意味がないので 0 に揃える', () => {
    const items = [
      {
        itemId: 'a',
        durationFrames: 150,
        transitionOut: { type: 'cut' as const, durationFrames: 100 },
      },
      { itemId: 'b', durationFrames: 150 },
    ]
    expect(clampAfterResize(items)[0].transitionOut).toEqual({ type: 'cut', durationFrames: 0 })
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
