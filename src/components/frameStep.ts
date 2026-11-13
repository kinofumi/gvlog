/**
 * 矢印ボタン 1 回で動かすフレーム数（30fps で 0.1 秒なら 3）。fps が極端に低くても 1 フレームは動く。
 * fps は型のうえでは 30 だけ（ADR 009）だが、壊れた値が来ても NaN を返さないよう有限でないときは 1 にする
 */
export function framesPerStep(fps: number, stepSeconds: number): number {
  const frames = Math.round(fps * stepSeconds)
  return Number.isFinite(frames) ? Math.max(1, frames) : 1
}

/**
 * スライダーの横の矢印ボタンで値を 1 段階（step フレーム）動かす。
 * 値は step の格子（0, step, 2step, ...）に乗せる。格子に乗っていない値（動画の尺など）は、進むなら次の格子、戻るなら前の格子へ。
 * 結果は min〜max に収める（範囲の外にあった値も中に戻す）。
 */
export function stepFrames(
  value: number,
  direction: 1 | -1,
  step: number,
  min: number,
  max: number,
): number {
  const next =
    direction > 0 ? Math.floor(value / step) * step + step : Math.ceil(value / step) * step - step
  return Math.max(min, Math.min(max, next))
}
