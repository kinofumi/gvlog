// プレビュー用 <video> の操作の判断（純粋関数）。DOM に触る部分は previewVideos.ts にある。

/** 時刻が合っているとみなす許容（秒）。停止中のシークは細かく、再生中のずれは 100ms まで許す（plan §3.3） */
export const SEEK_TOLERANCE_SEC = 0.02
export const DRIFT_TOLERANCE_SEC = 0.1

/** <video> の状態のうち、判断に使うもの */
export type VideoState = {
  currentTime: number
  /** 読み込み前は NaN */
  duration: number
  paused: boolean
  seeking: boolean
  ended: boolean
  /** この要素に最後に要求した時刻。まだ無ければ null */
  requested: number | null
}

export type VideoCommand = {
  /** この時刻へシークする。null なら不要 */
  seekTo: number | null
  play: boolean
  pause: boolean
}

/**
 * 素材内の時刻 timeSec を見せるために <video> に何をするかを決める。
 * - 末尾を過ぎた時刻は末尾に留める（末尾フレームのホールド、plan §2.3）。再生中でも play() しない
 *   （ended のあとの play() は先頭に戻ってしまう）。
 * - 同じ時刻を要求済みなら要求し直さない。ブラウザは末尾やフレーム境界に位置を寄せるので、
 *   ずれだけで判断すると seeked → 描き直し → 再要求の循環になる。
 */
export function planFrame(state: VideoState, timeSec: number, playing: boolean): VideoCommand {
  const end = Number.isFinite(state.duration) ? state.duration : Number.POSITIVE_INFINITY
  const target = Math.min(timeSec, end)
  const holding = timeSec >= end || state.ended
  const drift = Math.abs(state.currentTime - target)
  const notYetRequested = state.requested !== target

  if (playing && !holding) {
    const seekTo = drift > DRIFT_TOLERANCE_SEC && notYetRequested ? target : null
    return { seekTo, play: state.paused, pause: false }
  }
  // 停止中、または末尾のホールド
  const seekTo = drift > SEEK_TOLERANCE_SEC && !state.seeking && notYetRequested ? target : null
  return { seekTo, play: false, pause: !state.paused }
}
