import { describe, expect, it } from 'vitest'
import { itemProgress } from './progress'

describe('itemProgress（素材が見えている区間の中での進行度）', () => {
  const item = {
    itemId: 'a',
    coreStart: 0,
    coreEnd: 150,
    visibleStart: 0,
    visibleEnd: 155,
    transitionOut: null,
  }

  it('見え始めで 0、最後のフレームで 1', () => {
    expect(itemProgress(item, 0)).toBe(0)
    expect(itemProgress(item, 154)).toBe(1)
  })

  it('中間は線形（フレーム 77 は 77/154）', () => {
    expect(itemProgress(item, 77)).toBeCloseTo(77 / 154)
  })

  it('範囲外は 0〜1 に丸める', () => {
    expect(itemProgress(item, -10)).toBe(0)
    expect(itemProgress(item, 300)).toBe(1)
  })

  it('1 フレームだけの素材は常に 0', () => {
    expect(itemProgress({ ...item, visibleEnd: 1 }, 0)).toBe(0)
  })
})
