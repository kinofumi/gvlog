import { describe, expect, it } from 'vitest'
import {
  checkDurations,
  clampDuration,
  defaultDurations,
  equalSplit,
  maxItems,
  outputFrames,
  overflowFrames,
  sumFrames,
} from './durations'

describe('equalSplit（均等割り）', () => {
  it('割り切れるときは全員同じ尺になる', () => {
    expect(equalSplit(2, 300)).toEqual([150, 150])
  })

  it('端数は先頭から 1 フレームずつ配り、合計は常に指定したフレーム数と一致する', () => {
    const result = equalSplit(7, 300) // 300 / 7 = 42 余り 6
    expect(result).toEqual([43, 43, 43, 43, 43, 43, 42])
    expect(result.reduce((a, b) => a + b, 0)).toBe(300)
  })

  it('素材が 1 つなら指定したフレーム数そのものになる', () => {
    expect(equalSplit(1, 300)).toEqual([300])
  })

  it('素材が 0 なら空配列を返す', () => {
    expect(equalSplit(0, 300)).toEqual([])
  })
})

describe('maxItems（素材数の上限）', () => {
  it('15 秒（450 フレーム）なら最小尺 1 秒で 15 個まで', () => {
    expect(maxItems(450)).toBe(15)
  })

  it('5 秒（150 フレーム）なら 5 個まで', () => {
    expect(maxItems(150)).toBe(5)
  })
})

describe('defaultDurations（追加した素材の初期の尺 = 上限までの残りを均等に割る）', () => {
  it('何も無いところに 5 個入れると 15 秒を 3 秒ずつ', () => {
    expect(defaultDurations(0, 5, 450)).toEqual([90, 90, 90, 90, 90])
  })

  it('すでに 12 秒使っていれば、残り 3 秒を新しい素材で分ける', () => {
    expect(defaultDurations(360, 2, 450)).toEqual([45, 45])
  })

  it('残りが足りなければ最小尺（1 秒）ずつ。上限を超えるかどうかは呼び出し側が知らせる', () => {
    expect(defaultDurations(450, 2, 450)).toEqual([30, 30])
    expect(defaultDurations(420, 2, 450)).toEqual([30, 30]) // 残り 30 では 2 個に 1 秒ずつ配れない
  })

  it('0 個なら空', () => {
    expect(defaultDurations(0, 0, 450)).toEqual([])
  })
})

describe('clampDuration（1 つの尺を規則内に整える）', () => {
  it('整数に切り捨て、最小尺以上・上限以下に収める', () => {
    expect(clampDuration(100.9, 450)).toBe(100)
    expect(clampDuration(10, 450)).toBe(30)
    expect(clampDuration(1000, 450)).toBe(450)
  })

  it('数でない値（空の入力欄など）は null', () => {
    expect(clampDuration(Number.NaN, 450)).toBeNull()
    expect(clampDuration(Number.POSITIVE_INFINITY, 450)).toBeNull()
  })
})

describe('sumFrames / outputFrames / overflowFrames（合計と、上限で切った出力の長さ）', () => {
  it('合計が上限以下なら出力は合計のまま、はみ出しは 0', () => {
    expect(sumFrames([90, 90, 90])).toBe(270)
    expect(outputFrames([90, 90, 90], 450)).toBe(270)
    expect(overflowFrames([90, 90, 90], 450)).toBe(0)
  })

  it('合計が上限を超えたら出力は上限で止まり、はみ出しは超えた分', () => {
    expect(outputFrames([300, 300], 450)).toBe(450)
    expect(overflowFrames([300, 300], 450)).toBe(150)
  })

  it('素材が無ければ出力は 0', () => {
    expect(outputFrames([], 450)).toBe(0)
  })
})

describe('checkDurations（尺の規則）', () => {
  it('全員が最小尺以上の整数なら問題なし', () => {
    expect(checkDurations([150, 150])).toEqual([])
  })

  it('最小尺未満や非整数の尺はエラー', () => {
    expect(checkDurations([10, 290])).toContain('素材 1 の尺（10）が最小尺（30）未満です。')
    expect(checkDurations([150.5, 149.5])).toContain('素材 1 の尺（150.5）が整数ではありません。')
  })

  it('素材が 0 なら問題なし（空のタイムライン）', () => {
    expect(checkDurations([])).toEqual([])
  })
})
