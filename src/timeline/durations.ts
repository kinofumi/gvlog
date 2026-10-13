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

/** 1 つの素材が取れる尺の上限。他の素材が全員最小尺のときの残り */
export function maxItemFrames(count: number, totalFrames: number): number {
  return totalFrames - MIN_ITEM_FRAMES * (count - 1)
}

/**
 * index 番目の尺を newFrames にし、差分を他の素材へ尺に比例して配る。合計は変わらない。
 * 比例配分で最小尺を下回る素材は最小尺で止め、残りの差分をさらに他へ回す。
 * 変更できないとき（素材が 1 つ、他が全員最小尺）は元の配列をそのまま返す。
 */
export function adjustDurations(durations: number[], index: number, newFrames: number): number[] {
  const n = durations.length
  if (n <= 1) return durations
  if (index < 0 || index >= n) return durations
  // 入力欄が空のときなど、数にならない値は無視する
  if (!Number.isFinite(newFrames)) return durations
  // 元の尺が規則を満たしていなければ、ここで直そうとせずそのまま返す（不変条件は checkDurations で見る）
  if (!durations.every(isValidDuration)) return durations

  const total = durations.reduce((sum, d) => sum + d, 0)
  // 他の素材が全員最小尺のときの、この素材の上限
  const upper = maxItemFrames(n, total)
  const target = Math.min(Math.max(Math.floor(newFrames), MIN_ITEM_FRAMES), upper)
  if (target === durations[index]) return durations

  const result = [...durations]
  result[index] = target
  const others = result.map((_, i) => i).filter((i) => i !== index)
  const delta = target - durations[index]

  if (delta < 0) {
    // 減らした分を他へ配る。配る側に上限はないので 1 回で終わる
    const parts = splitProportionally(
      -delta,
      others.map((i) => result[i]),
    )
    others.forEach((i, k) => {
      result[i] += parts[k]
    })
    return result
  }

  // 増やした分を他から取る。最小尺で止まった素材は候補から外し、残りを次の周で他から取る
  let remaining = delta
  let candidates = others
  while (remaining > 0 && candidates.length > 0) {
    const parts = splitProportionally(
      remaining,
      candidates.map((i) => result[i]),
    )
    const next: number[] = []
    candidates.forEach((i, k) => {
      const take = Math.min(parts[k], result[i] - MIN_ITEM_FRAMES)
      result[i] -= take
      remaining -= take
      if (result[i] > MIN_ITEM_FRAMES) next.push(i)
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
  // 量が負・非整数、または配る先がないのは呼び出し側の誤り。黙って変な値を返すより止める
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`配る量は 0 以上の整数にしてください: ${amount}`)
  }
  if (!weights.every((w) => Number.isFinite(w) && w >= 0)) {
    throw new Error(`重みは 0 以上の数にしてください: ${weights.join(', ')}`)
  }
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) {
    if (amount === 0) return weights.map(() => 0)
    throw new Error('重みがすべて 0 なので配れません。')
  }

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

function isValidDuration(d: number): boolean {
  return Number.isInteger(d) && d >= MIN_ITEM_FRAMES
}

/**
 * 尺の不変条件を確かめ、問題を日本語の文で返す（なければ空）。
 * 合計 = totalFrames、各尺は最小尺以上の整数。素材が 0 のときは空のタイムラインとして問題なし。
 */
export function checkDurations(durations: number[], totalFrames: number): string[] {
  const errors: string[] = []
  if (durations.length === 0) return errors

  durations.forEach((d, i) => {
    if (!Number.isInteger(d)) {
      errors.push(`素材 ${i + 1} の尺（${d}）が整数ではありません。`)
    } else if (d < MIN_ITEM_FRAMES) {
      errors.push(`素材 ${i + 1} の尺（${d}）が最小尺（${MIN_ITEM_FRAMES}）未満です。`)
    }
  })
  const total = durations.reduce((sum, d) => sum + d, 0)
  if (total !== totalFrames) {
    errors.push(`尺の合計（${total}）が総尺（${totalFrames}）と一致しません。`)
  }
  return errors
}
