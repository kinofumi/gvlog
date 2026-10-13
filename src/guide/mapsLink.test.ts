import { describe, expect, it } from 'vitest'
import { mapsSearchUrl } from './mapsLink'

describe('mapsSearchUrl（場所の名前から Google マップの検索リンクを作る）', () => {
  it('日本語の名前を URL エンコードして query に入れる', () => {
    expect(mapsSearchUrl('那珂湊駅')).toBe(
      'https://www.google.com/maps/search/?api=1&query=%E9%82%A3%E7%8F%82%E6%B9%8A%E9%A7%85',
    )
  })

  it('空白を含む名前もそのまま 1 つの検索語になる', () => {
    expect(mapsSearchUrl('湊公園 ひたちなか')).toContain('query=%E6%B9%8A%E5%85%AC%E5%9C%92%20')
  })
})
