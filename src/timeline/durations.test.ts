import { describe, expect, it } from 'vitest'
import { equalSplit } from './durations'

describe('equalSplit（均等割り）', () => {
  it('割り切れるときは全員同じ尺になる', () => {
    expect(equalSplit(2, 300)).toEqual([150, 150])
  })

  it('端数は先頭から 1 フレームずつ配り、合計は常に総フレーム数と一致する', () => {
    const result = equalSplit(7, 300) // 300 / 7 = 42 余り 6
    expect(result).toEqual([43, 43, 43, 43, 43, 43, 42])
    expect(result.reduce((a, b) => a + b, 0)).toBe(300)
  })

  it('素材が 1 つなら総フレーム数そのものになる', () => {
    expect(equalSplit(1, 300)).toEqual([300])
  })

  it('素材が 0 なら空配列を返す', () => {
    expect(equalSplit(0, 300)).toEqual([])
  })
})
