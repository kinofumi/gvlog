/** 1 素材の最小尺（1 秒） */
export const MIN_ITEM_FRAMES = 30

/** 総尺に入る素材数の上限（全員が最小尺のとき） */
export function maxItems(totalFrames: number): number {
  return Math.floor(totalFrames / MIN_ITEM_FRAMES)
}

/**
 * 総フレーム数を n 個の素材に均等に割る。
 * 端数は先頭から 1 フレームずつ配るので、合計は常に totalFrames と一致する。
 */
export function equalSplit(n: number, totalFrames: number): number[] {
  if (n <= 0) return []
  return splitProportionally(totalFrames, new Array<number>(n).fill(1))
}

/**
 * index 番目の尺を newFrames にし、差分を他の素材へ尺に比例して配る。合計は変わらない。
 * 比例配分で最小尺を下回る素材は最小尺で止め、残りの差分をさらに他へ回す。
 * 変更できないとき（素材が 1 つ、他が全員最小尺）は元の配列をそのまま返す。
 */
export function adjustDurations(durations: number[], index: number, newFrames: number): number[] {
  const n = durations.length
  if (n <= 1) return durations

  const total = durations.reduce((sum, d) => sum + d, 0)
  // 他の素材が全員最小尺のときの、この素材の上限
  const upper = total - MIN_ITEM_FRAMES * (n - 1)
  const target = Math.min(Math.max(newFrames, MIN_ITEM_FRAMES), upper)
  if (target === durations[index]) return durations

  const result = [...durations]
  result[index] = target
  // 他の素材が吸収すべき量。正なら他から取る、負なら他へ配る
  let remaining = target - durations[index]
  let candidates = result.map((_, i) => i).filter((i) => i !== index)

  while (remaining !== 0 && candidates.length > 0) {
    const weights = candidates.map((i) => result[i])
    const parts = splitProportionally(Math.abs(remaining), weights)
    const next: number[] = []
    candidates.forEach((i, k) => {
      if (remaining > 0) {
        // 取る: 最小尺までしか取れない。まだ余裕があれば次の周でも候補
        const take = Math.min(parts[k], result[i] - MIN_ITEM_FRAMES)
        result[i] -= take
        remaining -= take
        if (result[i] > MIN_ITEM_FRAMES) next.push(i)
      } else {
        result[i] += parts[k]
        remaining += parts[k]
      }
    })
    candidates = next
  }

  return remaining === 0 ? result : durations
}

/**
 * amount を weights に比例した整数に分ける。合計は必ず amount。
 * 端数は「切り捨てで捨てた量が大きい順」に 1 ずつ足す（最大剰余方式）。
 */
export function splitProportionally(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) return weights.map(() => 0)

  const exact = weights.map((w) => (amount * w) / totalWeight)
  const parts = exact.map(Math.floor)
  let leftover = amount - parts.reduce((sum, p) => sum + p, 0)

  const order = exact
    .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i)
  for (const { i } of order) {
    if (leftover === 0) break
    parts[i] += 1
    leftover -= 1
  }
  return parts
}
