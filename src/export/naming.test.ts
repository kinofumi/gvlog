import { describe, expect, it } from 'vitest'
import { buildFileName } from './naming'

describe('buildFileName（出力ファイル名）', () => {
  const date = new Date(2026, 9, 8, 14, 5, 9) // 2026-10-08 14:05:09

  it('名前を _ でつなぎ、日付と時刻（秒まで）を付ける', () => {
    expect(buildFileName(['Vlog'], date)).toBe('Vlog_20261008_140509.mp4')
    expect(buildFileName(['Vlog', 'つなげる'], date)).toBe('Vlog_つなげる_20261008_140509.mp4')
  })

  it('月・日・時・分・秒は 2 桁に 0 埋めする', () => {
    expect(buildFileName(['Vlog'], new Date(2026, 0, 3, 9, 5, 0))).toBe('Vlog_20260103_090500.mp4')
  })

  it('ファイル名に使えない文字は _ に置き換える', () => {
    expect(buildFileName(['a/b', 'c:d'], date)).toBe('a_b_c_d_20261008_140509.mp4')
  })

  it('空欄や使えない文字だけの名前は飛ばし、全部そうなら video にする', () => {
    expect(buildFileName(['Vlog', '  '], date)).toBe('Vlog_20261008_140509.mp4')
    expect(buildFileName(['', '  ', '?'], date)).toBe('video_20261008_140509.mp4')
  })
})
