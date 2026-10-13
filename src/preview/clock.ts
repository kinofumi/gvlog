/**
 * 再生開始からの経過時間（ms）を、表示すべきフレーム番号に変える。
 * requestAnimationFrame は端末によって 60Hz や 120Hz で呼ばれるので、
 * 「呼ばれた回数」ではなく「経過時間」からフレームを決める（速さが端末で変わらない）。
 */
export function frameAtElapsed(
  startFrame: number,
  elapsedMs: number,
  fps: number,
  totalFrames: number,
): { frame: number; finished: boolean } {
  const frame = startFrame + Math.floor((elapsedMs * fps) / 1000)
  if (frame >= totalFrames - 1) return { frame: totalFrames - 1, finished: true }
  return { frame, finished: false }
}
