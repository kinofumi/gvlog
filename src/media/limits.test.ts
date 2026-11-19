import { describe, expect, it } from 'vitest'
import { isVideoTooLong } from './limits'

describe('isVideoTooLong', () => {
  it('30 秒ちょうどと、それより短い動画は通す', () => {
    expect(isVideoTooLong(30, 30)).toBe(false)
    expect(isVideoTooLong(12.4, 30)).toBe(false)
    expect(isVideoTooLong(0, 30)).toBe(false)
  })

  it('撮影アプリの端数（30.3 秒など）は 30 秒の動画として通す', () => {
    expect(isVideoTooLong(30.3, 30)).toBe(false)
    expect(isVideoTooLong(30.5, 30)).toBe(false)
  })

  it('端数の範囲を超えたら長すぎる', () => {
    expect(isVideoTooLong(30.6, 30)).toBe(true)
    expect(isVideoTooLong(31, 30)).toBe(true)
    expect(isVideoTooLong(125, 30)).toBe(true)
  })

  it('上限が無い（undefined）なら長さに関係なく通す', () => {
    expect(isVideoTooLong(600, undefined)).toBe(false)
  })
})
