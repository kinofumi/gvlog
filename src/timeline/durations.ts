// 尺の規則（plan §2.2、ADR 015）。各素材の尺は独立で、合計が上限（preset.maxFrames）を超えた分は出力で切り捨てる。

/** 1 素材の最小尺（1 秒） */
export const MIN_ITEM_FRAMES = 30

/** 上限に入る素材数（全員が最小尺のとき） */
export function maxItems(maxFrames: number): number {
  return Math.floor(maxFrames / MIN_ITEM_FRAMES)
}

/**
 * frames を n 個の素材に均等に割る。
 * 端数は先頭から 1 フレームずつ配るので、合計は常に frames と一致する。
 */
export function equalSplit(n: number, frames: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(frames / n)
  const extra = frames - base * n
  return Array.from({ length: n }, (_, i) => (i < extra ? base + 1 : base))
}

/**
 * 追加する n 個の素材の初期の尺。上限までの残り（maxFrames − usedFrames）を均等に割る。
 * 残りが n 個に最小尺ずつ配れないときは全員最小尺にする（合計が上限を超えることは呼び出し側が利用者に知らせる）。
 */
export function defaultDurations(usedFrames: number, n: number, maxFrames: number): number[] {
  if (n <= 0) return []
  const remaining = Math.max(0, maxFrames - usedFrames)
  if (remaining < MIN_ITEM_FRAMES * n) return new Array<number>(n).fill(MIN_ITEM_FRAMES)
  return equalSplit(n, remaining)
}

/** 1 つの尺を規則内に整える: 整数に切り捨て、最小尺以上・上限以下。数でない値は null（呼び出し側は無視する） */
export function clampDuration(frames: number, maxFrames: number): number | null {
  if (!Number.isFinite(frames)) return null
  return Math.max(MIN_ITEM_FRAMES, Math.min(Math.floor(frames), maxFrames))
}

/** 尺の合計（タイムラインの長さ） */
export function sumFrames(durations: number[]): number {
  return durations.reduce((sum, d) => sum + d, 0)
}

/** 出力の長さ。合計が上限を超えた分は先頭から maxFrames で切る */
export function outputFrames(durations: number[], maxFrames: number): number {
  return Math.min(sumFrames(durations), maxFrames)
}

/** 上限を超えている分（0 なら収まっている）。利用者への注意表示に使う */
export function overflowFrames(durations: number[], maxFrames: number): number {
  return Math.max(0, sumFrames(durations) - maxFrames)
}

/**
 * 尺の規則を確かめ、問題を日本語の文で返す（なければ空）。各尺は最小尺以上の整数。
 * 合計には規則がない（上限を超えた分は出力で切る）。
 */
export function checkDurations(durations: number[]): string[] {
  const errors: string[] = []
  durations.forEach((d, i) => {
    if (!Number.isInteger(d)) {
      errors.push(`素材 ${i + 1} の尺（${d}）が整数ではありません。`)
    } else if (d < MIN_ITEM_FRAMES) {
      errors.push(`素材 ${i + 1} の尺（${d}）が最小尺（${MIN_ITEM_FRAMES}）未満です。`)
    }
  })
  return errors
}
