import type { CompiledItem } from '../timeline/compile'

/**
 * 素材が見えている区間の中での進行度（0〜1）。見え始めで 0、最後のフレームで 1。
 * Ken Burns の from → to はこの値で補間する（plan §2.3）。
 */
export function itemProgress(item: CompiledItem, frame: number): number {
  const span = item.visibleEnd - item.visibleStart - 1
  if (span <= 0) return 0
  const p = (frame - item.visibleStart) / span
  return Math.max(0, Math.min(1, p))
}
