import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET } from './defaults'
import { validatePreset } from './validate'

describe('validatePreset（プリセットの検証）', () => {
  it('既定のプリセットは通る', () => {
    expect(validatePreset(DEFAULT_PRESET)).toEqual({ ok: true, preset: DEFAULT_PRESET })
  })

  it('横型 1920x1080 も通る', () => {
    const preset = { ...DEFAULT_PRESET, aspect: '16:9', width: 1920, height: 1080 }
    expect(validatePreset(preset)).toEqual({ ok: true, preset })
  })

  it('オブジェクトでなければエラー', () => {
    expect(validatePreset(null)).toEqual({ ok: false, errors: ['プリセットの形式が不正です。'] })
  })

  it('縦横比が 16:9 / 9:16 以外ならエラー', () => {
    const result = validatePreset({ ...DEFAULT_PRESET, aspect: '4:3' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toContain('縦横比は 16:9 か 9:16 だけです。')
  })

  it('縦横比と解像度が合っていなければエラー', () => {
    const result = validatePreset({ ...DEFAULT_PRESET, width: 1920, height: 1080 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toContain('9:16 の解像度は 1080x1920 だけです。')
  })

  it('fps が 30 以外ならエラー', () => {
    const result = validatePreset({ ...DEFAULT_PRESET, fps: 60 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toContain('fps は 30 だけです。')
  })

  it('合計尺は 150〜900 フレーム（5〜30 秒）の整数', () => {
    for (const totalFrames of [100, 1000, 300.5]) {
      const result = validatePreset({ ...DEFAULT_PRESET, totalFrames })
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(result.errors).toContain('合計の尺は 5〜30 秒（150〜900 フレーム）です。')
    }
    expect(validatePreset({ ...DEFAULT_PRESET, totalFrames: 150 }).ok).toBe(true)
    expect(validatePreset({ ...DEFAULT_PRESET, totalFrames: 900 }).ok).toBe(true)
  })

  it('名前が空ならエラー', () => {
    const result = validatePreset({ ...DEFAULT_PRESET, name: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toContain('プリセット名が空です。')
  })

  it('複数の問題はすべて集める', () => {
    const result = validatePreset({ ...DEFAULT_PRESET, fps: 60, totalFrames: 10 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toHaveLength(2)
  })
})
