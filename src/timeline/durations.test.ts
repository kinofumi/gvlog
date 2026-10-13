import { describe, expect, it } from 'vitest'
import { adjustDurations, equalSplit, maxItems, splitProportionally } from './durations'

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

describe('maxItems（素材数の上限）', () => {
  it('10 秒（300 フレーム）なら最小尺 1 秒で 10 個まで', () => {
    expect(maxItems(300)).toBe(10)
  })

  it('5 秒（150 フレーム）なら 5 個まで', () => {
    expect(maxItems(150)).toBe(5)
  })
})

describe('adjustDurations（1 つの尺を変え、差分を他へ比例配分する）', () => {
  it('素材が 1 つのときは変更できず元のまま', () => {
    expect(adjustDurations([300], 0, 100)).toEqual([300])
  })

  it('変えたあとも合計は総尺のまま', () => {
    const result = adjustDurations([100, 100, 100], 0, 150)
    expect(result[0]).toBe(150)
    expect(result.reduce((a, b) => a + b, 0)).toBe(300)
  })

  it('差分は他の素材の尺に比例して配る', () => {
    expect(adjustDurations([100, 100, 200], 0, 160)).toEqual([160, 80, 160])
  })

  it('減らすと他の素材が比例して増える', () => {
    expect(adjustDurations([200, 50, 50], 0, 100)).toEqual([100, 100, 100])
  })

  it('最小尺を下回る素材は最小尺で止め、残りの差分をさらに他へ回す', () => {
    expect(adjustDurations([100, 40, 160], 0, 200)).toEqual([200, 30, 70])
  })

  it('最小尺より小さい値を指定しても最小尺（30 フレーム）に丸める', () => {
    expect(adjustDurations([150, 150], 0, 10)).toEqual([30, 270])
  })

  it('他の素材が全員最小尺のときは増やせず元のまま', () => {
    expect(adjustDurations([240, 30, 30], 0, 260)).toEqual([240, 30, 30])
  })

  it('端数が出ても整数で配り、合計が合う', () => {
    const result = adjustDurations([100, 100, 100], 0, 101)
    expect(result[0]).toBe(101)
    expect(result.reduce((a, b) => a + b, 0)).toBe(300)
    expect(result.every(Number.isInteger)).toBe(true)
  })

  it('元の配列は変更しない', () => {
    const original = [100, 100, 100]
    adjustDurations(original, 0, 150)
    expect(original).toEqual([100, 100, 100])
  })
})

describe('splitProportionally（整数の比例配分）', () => {
  it('重みに比例して分け、合計は必ず指定量になる', () => {
    expect(splitProportionally(60, [100, 200])).toEqual([20, 40])
  })

  it('端数は切り捨てで捨てた量が大きい順に 1 ずつ足す', () => {
    // 10 を 1:1:1 に分けると 3.33 ずつ。端数が同じなら先頭から
    expect(splitProportionally(10, [1, 1, 1])).toEqual([4, 3, 3])
    // 7 を 1:2 に分けると 2.33 と 4.67。端数の大きい後ろが先に +1
    expect(splitProportionally(7, [1, 2])).toEqual([2, 5])
  })

  it('重みがすべて 0 なら何も配らない', () => {
    expect(splitProportionally(10, [0, 0])).toEqual([0, 0])
  })
})
