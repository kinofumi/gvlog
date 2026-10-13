import { describe, expect, it } from 'vitest'
import { easeInOut } from './easing'

describe('easeInOut（ゆっくり始まりゆっくり終わる補間）', () => {
  it('両端はそのまま、中央は 0.5', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.5)).toBe(0.5)
  })

  it('前半は遅く、後半は速い（対称）', () => {
    expect(easeInOut(0.25)).toBeCloseTo(0.125)
    expect(easeInOut(0.75)).toBeCloseTo(0.875)
    expect(easeInOut(0.25) + easeInOut(0.75)).toBeCloseTo(1)
  })

  it('範囲外は 0〜1 に丸める', () => {
    expect(easeInOut(-1)).toBe(0)
    expect(easeInOut(2)).toBe(1)
  })
})
