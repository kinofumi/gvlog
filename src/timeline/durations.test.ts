import { describe, expect, it } from 'vitest'
import {
  checkDurations,
  clampDuration,
  defaultDuration,
  maxItems,
  outputFrames,
  overflowFrames,
  sumFrames,
} from './durations'

describe('maxItems（素材数の上限）', () => {
  it('15 秒（450 フレーム）なら最小尺 1 秒で 15 個まで', () => {
    expect(maxItems(450)).toBe(15)
  })

  it('5 秒（150 フレーム）なら 5 個まで', () => {
    expect(maxItems(150)).toBe(5)
  })
})

describe('defaultDuration（追加した素材の初期の尺 = 5 秒固定）', () => {
  it('上限が 15 秒なら 5 秒（150 フレーム）。すでに使っている長さには関係しない', () => {
    expect(defaultDuration(450)).toBe(150)
  })

  it('上限が 5 秒より短いプリセットなら上限まで', () => {
    expect(defaultDuration(60)).toBe(60)
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
