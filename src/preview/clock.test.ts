import { describe, expect, it } from 'vitest'
import { frameAtElapsed } from './clock'

describe('frameAtElapsed（再生開始からの経過時間 → フレーム番号）', () => {
  it('経過 0 なら開始フレーム、1 秒で 30 フレーム進む', () => {
    expect(frameAtElapsed(0, 0, 30, 300)).toEqual({ frame: 0, finished: false })
    expect(frameAtElapsed(0, 1000, 30, 300)).toEqual({ frame: 30, finished: false })
    expect(frameAtElapsed(100, 1000, 30, 300)).toEqual({ frame: 130, finished: false })
  })

  it('フレームの途中の時間は切り捨てる（表示は常に整数フレーム）', () => {
    expect(frameAtElapsed(0, 49, 30, 300).frame).toBe(1)
    expect(frameAtElapsed(0, 33, 30, 300).frame).toBe(0)
  })

  it('末尾に達したら最後のフレームで止まり finished になる', () => {
    expect(frameAtElapsed(0, 10000, 30, 300)).toEqual({ frame: 299, finished: true })
    expect(frameAtElapsed(290, 1000, 30, 300)).toEqual({ frame: 299, finished: true })
  })

  it('経過時間が負（rAF の時刻が開始時刻より前）でも開始フレームから戻らない', () => {
    expect(frameAtElapsed(120, -3, 30, 300)).toEqual({ frame: 120, finished: false })
  })

  it('最後のフレームの手前は finished ではない', () => {
    expect(frameAtElapsed(0, 9966, 30, 300)).toEqual({ frame: 298, finished: false })
  })
})
