import { describe, expect, it } from 'vitest'
import {
  adjustDurations,
  checkDurations,
  equalSplit,
  maxItemFrames,
  maxItems,
  splitProportionally,
} from './durations'

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

describe('maxItemFrames（1 つの素材が取れる尺の上限 = 他が全員最小尺のときの残り）', () => {
  it('10 秒で 3 素材なら 300 − 30 × 2 = 240', () => {
    expect(maxItemFrames(3, 300)).toBe(240)
  })

  it('素材が 1 つなら総尺そのもの', () => {
    expect(maxItemFrames(1, 300)).toBe(300)
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

  it('元の尺が不正（最小尺未満、非整数）なら何もせず元のまま', () => {
    expect(adjustDurations([10, 10], 0, 30)).toEqual([10, 10])
    expect(adjustDurations([100.5, 199.5], 0, 150)).toEqual([100.5, 199.5])
  })

  it('index が範囲外なら元のまま', () => {
    expect(adjustDurations([150, 150], 2, 100)).toEqual([150, 150])
    expect(adjustDurations([150, 150], -1, 100)).toEqual([150, 150])
  })

  it('newFrames が非整数なら切り捨てて扱う', () => {
    expect(adjustDurations([150, 150], 0, 100.9)).toEqual([100, 200])
  })

  it('newFrames が NaN や Infinity なら元のまま（入力欄が空のときなど）', () => {
    expect(adjustDurations([150, 150], 0, Number.NaN)).toEqual([150, 150])
    expect(adjustDurations([150, 150], 0, Number.POSITIVE_INFINITY)).toEqual([150, 150])
  })
})

describe('checkDurations（尺の不変条件）', () => {
  it('合計が総尺と一致し、全員が最小尺以上の整数なら問題なし', () => {
    expect(checkDurations([150, 150], 300)).toEqual([])
  })

  it('合計が総尺と違えばエラー', () => {
    expect(checkDurations([150, 100], 300)).toEqual([
      '尺の合計（250）が総尺（300）と一致しません。',
    ])
  })

  it('最小尺未満や非整数の尺はエラー', () => {
    expect(checkDurations([10, 290], 300)).toContain('素材 1 の尺（10）が最小尺（30）未満です。')
    expect(checkDurations([150.5, 149.5], 300)).toContain(
      '素材 1 の尺（150.5）が整数ではありません。',
    )
  })

  it('素材が 0 なら総尺に関係なく問題なし（空のタイムライン）', () => {
    expect(checkDurations([], 300)).toEqual([])
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

  it('量が 0 なら何も配らない（重みがすべて 0 でもよい）', () => {
    expect(splitProportionally(0, [0, 0])).toEqual([0, 0])
  })

  it('正の量を配る先がない（重みがすべて 0）のはプログラムの誤りなので投げる', () => {
    expect(() => splitProportionally(10, [0, 0])).toThrow()
  })

  it('量が負や非整数なのはプログラムの誤りなので投げる', () => {
    expect(() => splitProportionally(-1, [1, 1])).toThrow()
    expect(() => splitProportionally(0.5, [1, 1])).toThrow()
  })

  it('重みに負や NaN が混ざるのもプログラムの誤りなので投げる', () => {
    expect(() => splitProportionally(10, [-1, 2])).toThrow()
    expect(() => splitProportionally(10, [Number.NaN, 1])).toThrow()
  })
})
