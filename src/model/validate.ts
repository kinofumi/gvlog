import type { GroupPreset } from './types'

export const MIN_TOTAL_FRAMES = 150
export const MAX_TOTAL_FRAMES = 900

/** 縦横比ごとに許す解像度（v1 はこの 1 組ずつ） */
const SIZE_BY_ASPECT = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
} as const

export type ValidationResult = { ok: true; preset: GroupPreset } | { ok: false; errors: string[] }

/**
 * 外から来たプリセット（リンクのパラメータ、保存データ）を検証する。
 * 範囲外の値は既定値に置き換えず、エラーとして返す（表示して気づいてもらう）。
 */
export function validatePreset(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, errors: ['プリセットの形式が不正です。'] }
  }
  const p = value as Record<string, unknown>
  const errors: string[] = []

  if (typeof p.id !== 'string' || p.id === '') errors.push('プリセット ID が空です。')
  if (typeof p.name !== 'string' || p.name === '') errors.push('プリセット名が空です。')

  const aspect = p.aspect
  if (aspect !== '16:9' && aspect !== '9:16') {
    errors.push('縦横比は 16:9 か 9:16 だけです。')
  } else {
    const size = SIZE_BY_ASPECT[aspect]
    if (p.width !== size.width || p.height !== size.height) {
      errors.push(`${aspect} の解像度は ${size.width}x${size.height} だけです。`)
    }
  }

  if (p.fps !== 30) errors.push('fps は 30 だけです。')

  const totalFrames = p.totalFrames
  if (
    typeof totalFrames !== 'number' ||
    !Number.isInteger(totalFrames) ||
    totalFrames < MIN_TOTAL_FRAMES ||
    totalFrames > MAX_TOTAL_FRAMES
  ) {
    errors.push('合計の尺は 5〜30 秒（150〜900 フレーム）です。')
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    preset: {
      id: p.id as string,
      name: p.name as string,
      aspect: aspect as GroupPreset['aspect'],
      width: p.width as number,
      height: p.height as number,
      fps: 30,
      totalFrames: totalFrames as number,
    },
  }
}
