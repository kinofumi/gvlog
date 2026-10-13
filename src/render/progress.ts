import type { CompiledItem } from '../timeline/compile'
import { clamp01 } from './clamp01'

/**
 * 素材が見えている区間の中での進行度（0〜1）。見え始めで 0、最後のフレームで 1。
 * Ken Burns の from → to はこの値で補間する（plan §2.3）。
 */
export function itemProgress(item: CompiledItem, frame: number): number {
  const span = item.visibleEnd - item.visibleStart - 1
  if (span <= 0) return 0
  return clamp01((frame - item.visibleStart) / span)
}
