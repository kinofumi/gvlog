import { clamp01 } from './clamp01'

/** 0〜1 の進行度を、ゆっくり始まりゆっくり終わる曲線（2 次）に変える。範囲外は 0〜1 に丸める */
export function easeInOut(p: number): number {
  const t = clamp01(p)
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}
