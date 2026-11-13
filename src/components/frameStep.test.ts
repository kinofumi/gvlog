import { describe, expect, it } from 'vitest'
import { framesPerStep, stepFrames } from './frameStep'

describe('framesPerStep（矢印 1 回ぶんのフレーム数）', () => {
  it('30fps で 0.1 秒なら 3 フレーム、0.2 秒なら 6 フレーム（偶数。白フェードの境界が真っ白のまま）', () => {
    expect(framesPerStep(30, 0.1)).toBe(3)
    expect(framesPerStep(30, 0.2)).toBe(6)
  })

  it('24fps で 0.1 秒なら 2 フレーム（四捨五入）、極端に低い fps でも 1 フレームは動く', () => {
    expect(framesPerStep(24, 0.1)).toBe(2)
    expect(framesPerStep(4, 0.1)).toBe(1)
  })

  it('fps が壊れていて（NaN、Infinity）も NaN を返さず 1 フレームにする', () => {
    expect(framesPerStep(Number.NaN, 0.1)).toBe(1)
    expect(framesPerStep(Number.POSITIVE_INFINITY, 0.1)).toBe(1)
  })
})

describe('stepFrames（矢印ボタンで 1 段階動かす）', () => {
  it('格子に乗っている値は、そのまま 1 段階進む・戻る', () => {
    expect(stepFrames(150, 1, 3, 30, 450)).toBe(153)
    expect(stepFrames(150, -1, 3, 30, 450)).toBe(147)
  })

  it('格子に乗っていない値（動画の尺など）は、進むときは次の格子、戻るときは前の格子に乗る', () => {
    expect(stepFrames(151, 1, 3, 30, 450)).toBe(153)
    expect(stepFrames(151, -1, 3, 30, 450)).toBe(150)
    expect(stepFrames(152, -1, 3, 30, 450)).toBe(150)
  })

  it('上限・下限を越えない', () => {
    expect(stepFrames(449, 1, 3, 30, 450)).toBe(450)
    expect(stepFrames(450, 1, 3, 30, 450)).toBe(450)
    expect(stepFrames(31, -1, 3, 30, 450)).toBe(30)
    expect(stepFrames(30, -1, 3, 30, 450)).toBe(30)
  })

  it('上限・下限が格子に乗っていなくても、その値で止まる（動画の長さが上限のときなど）', () => {
    expect(stepFrames(450, 1, 3, 30, 451)).toBe(451)
    expect(stepFrames(451, 1, 3, 30, 451)).toBe(451)
    expect(stepFrames(33, -1, 3, 31, 450)).toBe(31)
    expect(stepFrames(31, -1, 3, 31, 450)).toBe(31)
  })

  it('上限と下限が同じ（動かせない）ときは、その値のまま', () => {
    expect(stepFrames(90, 1, 3, 90, 90)).toBe(90)
    expect(stepFrames(90, -1, 3, 90, 90)).toBe(90)
  })

  it('範囲の外にある値（元動画が短いときの終了位置など）は、範囲の中に戻す', () => {
    expect(stepFrames(500, -1, 3, 30, 450)).toBe(450)
    expect(stepFrames(10, 1, 3, 30, 450)).toBe(30)
  })
})
