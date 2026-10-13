import type { KenBurns } from '../model/types'
import { coverRect, type SourceRect } from './coverRect'
import { easeInOut } from './easing'

/**
 * ある進行度で、写真のどこを切り出して画面いっぱいに描くか（drawImage の sx, sy, sw, sh）。
 * zoom 1 = cover フィットの矩形（画面いっぱい）。zoom 1.2 なら矩形を 1/1.2 に縮める（寄る）。
 * cx, cy（0〜1）は矩形の中心を写真のどこに置くか。矩形が写真の外に出ないように端で止める。
 */
export function kenBurnsRect(
  kb: KenBurns,
  progress: number,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): SourceRect {
  const e = easeInOut(progress)
  const cx = lerp(kb.from.cx, kb.to.cx, e)
  const cy = lerp(kb.from.cy, kb.to.cy, e)
  const zoom = Math.max(1, lerp(kb.from.zoom, kb.to.zoom, e))

  const base = coverRect(srcW, srcH, dstW, dstH)
  const sw = base.sw / zoom
  const sh = base.sh / zoom
  const sx = Math.max(0, Math.min(cx * srcW - sw / 2, srcW - sw))
  const sy = Math.max(0, Math.min(cy * srcH - sh / 2, srcH - sh))
  return { sx, sy, sw, sh }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

const CENTER = { cx: 0.5, cy: 0.5 }

/** チップで選ぶ既定の動き。微調整したいときはこの値を書き換えて保存する */
export function kenBurnsPreset(presetId: KenBurns['presetId']): KenBurns {
  switch (presetId) {
    case 'none':
      return { presetId, from: { ...CENTER, zoom: 1 }, to: { ...CENTER, zoom: 1 } }
    case 'zoomIn':
      return { presetId, from: { ...CENTER, zoom: 1 }, to: { ...CENTER, zoom: 1.2 } }
    case 'zoomOut':
      return { presetId, from: { ...CENTER, zoom: 1.2 }, to: { ...CENTER, zoom: 1 } }
    case 'panLR':
      return {
        presetId,
        from: { cx: 0.35, cy: 0.5, zoom: 1.15 },
        to: { cx: 0.65, cy: 0.5, zoom: 1.15 },
      }
    case 'panRL':
      return {
        presetId,
        from: { cx: 0.65, cy: 0.5, zoom: 1.15 },
        to: { cx: 0.35, cy: 0.5, zoom: 1.15 },
      }
  }
}
