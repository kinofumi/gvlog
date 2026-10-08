/**
 * 総フレーム数を n 個の素材に均等に割る。
 * 端数は先頭から 1 フレームずつ配るので、合計は常に totalFrames と一致する。
 */
export function equalSplit(n: number, totalFrames: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(totalFrames / n)
  const remainder = totalFrames - base * n
  const result: number[] = []
  for (let i = 0; i < n; i++) {
    result.push(i < remainder ? base + 1 : base)
  }
  return result
}
