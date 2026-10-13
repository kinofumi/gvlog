import { describe, expect, it } from 'vitest'
import { buildFileName } from './naming'

describe('buildFileName（出力ファイル名）', () => {
  const date = new Date(2026, 9, 8) // 2026-10-08

  it('プリセット名_メンバー名_スポット_日付.mp4 になる', () => {
    expect(buildFileName('Trip2026', '木下', '清水寺', date)).toBe(
      'Trip2026_木下_清水寺_20261008.mp4',
    )
  })

  it('ファイル名に使えない文字は _ に置き換える', () => {
    expect(buildFileName('a/b', 'c:d', 'e?f', date)).toBe('a_b_c_d_e_f_20261008.mp4')
  })

  it('空欄は member と spot で埋める', () => {
    expect(buildFileName('Trip2026', '', '  ', date)).toBe('Trip2026_member_spot_20261008.mp4')
  })
})
