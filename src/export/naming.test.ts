import { describe, expect, it } from 'vitest'
import { buildFileName } from './naming'

describe('buildFileName（出力ファイル名）', () => {
  const date = new Date(2026, 9, 8, 14, 5) // 2026-10-08 14:05

  it('名前を _ でつなぎ、日付と時刻を付ける', () => {
    expect(buildFileName(['Vlog'], date)).toBe('Vlog_20261008_1405.mp4')
    expect(buildFileName(['Vlog', 'つなげる'], date)).toBe('Vlog_つなげる_20261008_1405.mp4')
  })

  it('ファイル名に使えない文字は _ に置き換える', () => {
    expect(buildFileName(['a/b', 'c:d'], date)).toBe('a_b_c_d_20261008_1405.mp4')
  })

  it('空欄は飛ばし、全部空なら video にする', () => {
    expect(buildFileName(['Vlog', '  '], date)).toBe('Vlog_20261008_1405.mp4')
    expect(buildFileName(['', '  '], date)).toBe('video_20261008_1405.mp4')
  })
})
