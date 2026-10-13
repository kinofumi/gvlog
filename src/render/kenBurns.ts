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
const PAN_ZOOM = 1.15
/**
 * パンの振れ幅。zoom で空く余白（(1 − 1/zoom) / 2）ちょうどにする。
 * 余白より大きく振ると、出力と同じ縦横比の写真では端で止まり、パンが途中で止まって見える。
 */
const PAN_MARGIN = (1 - 1 / PAN_ZOOM) / 2

/**
 * 中央から (dx, dy) の向きへ、余白ちょうどの振れ幅で動くパン。dx, dy は −1 / 0 / 1。
 * 正規化座標での振れ幅は縦横とも同じだが、画面上の動く量は写真の縦横比で変わる。
 * 例: 横長の写真を縦型に出すと cover が全高を使うので、縦の余白は zoom 分しかなく上下のパンは小さく見え、左右は大きく動く。
 */
function pan(presetId: KenBurns['presetId'], dx: number, dy: number): KenBurns {
  return {
    presetId,
    from: { cx: 0.5 - dx * PAN_MARGIN, cy: 0.5 - dy * PAN_MARGIN, zoom: PAN_ZOOM },
    to: { cx: 0.5 + dx * PAN_MARGIN, cy: 0.5 + dy * PAN_MARGIN, zoom: PAN_ZOOM },
  }
}

/** チップで選ぶ既定の動き。微調整したいときはこの値を書き換えて保存する */
const PRESETS: Record<KenBurns['presetId'], KenBurns> = {
  none: { presetId: 'none', from: { ...CENTER, zoom: 1 }, to: { ...CENTER, zoom: 1 } },
  zoomIn: { presetId: 'zoomIn', from: { ...CENTER, zoom: 1 }, to: { ...CENTER, zoom: 1.2 } },
  zoomOut: { presetId: 'zoomOut', from: { ...CENTER, zoom: 1.2 }, to: { ...CENTER, zoom: 1 } },
  panLR: pan('panLR', 1, 0),
  panRL: pan('panRL', -1, 0),
  panTB: pan('panTB', 0, 1),
  panBT: pan('panBT', 0, -1),
}

/** presetId に対応する動きを返す。未知の値（古い保存データなど）は none として扱う */
export function kenBurnsPreset(presetId: KenBurns['presetId']): KenBurns {
  const preset = PRESETS[presetId] ?? PRESETS.none
  return { presetId: preset.presetId, from: { ...preset.from }, to: { ...preset.to } }
}
