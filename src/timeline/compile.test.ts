import { describe, expect, it } from 'vitest'
import { compileSegments, segmentAt } from './compile'

describe('compileSegments（区間の計算）', () => {
  it('素材を順に並べ、区間は前の終わりから始まる', () => {
    const segments = compileSegments([
      { itemId: 'a', durationFrames: 150 },
      { itemId: 'b', durationFrames: 150 },
    ])
    expect(segments).toEqual([
      { itemId: 'a', start: 0, end: 150 },
      { itemId: 'b', start: 150, end: 300 },
    ])
  })
})

describe('segmentAt（そのフレームで見える素材）', () => {
  const segments = compileSegments([
    { itemId: 'a', durationFrames: 150 },
    { itemId: 'b', durationFrames: 150 },
  ])

  it('区間の先頭は含み、終わりは含まない', () => {
    expect(segmentAt(segments, 0)?.itemId).toBe('a')
    expect(segmentAt(segments, 149)?.itemId).toBe('a')
    expect(segmentAt(segments, 150)?.itemId).toBe('b')
    expect(segmentAt(segments, 299)?.itemId).toBe('b')
  })

  it('範囲外なら null を返す', () => {
    expect(segmentAt(segments, 300)).toBeNull()
    expect(segmentAt(segments, -1)).toBeNull()
  })
})
