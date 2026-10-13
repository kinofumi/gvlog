import { describe, expect, it } from 'vitest'
import type { KenBurns } from '../model/types'
import { kenBurnsPreset, kenBurnsRect } from './kenBurns'

// 4:3 の写真（4000x3000）を縦型 1080x1920 に cover すると、幅 1687.5 x 高さ 3000 の中央を使う
const SRC = { w: 4000, h: 3000 }
const DST = { w: 1080, h: 1920 }
const still = (cx: number, cy: number, zoom: number) => ({
  presetId: 'none' as const,
  from: { cx, cy, zoom },
  to: { cx, cy, zoom },
})

describe('kenBurnsRect（ある進行度で写真のどこを切り出すか）', () => {
  it('zoom 1 の中央は cover の矩形と同じ', () => {
    expect(kenBurnsRect(still(0.5, 0.5, 1), 0, SRC.w, SRC.h, DST.w, DST.h)).toEqual({
      sx: 1156.25,
      sy: 0,
      sw: 1687.5,
      sh: 3000,
    })
  })

  it('zoom 1.2 は矩形を 1/1.2 に縮めて中央に置く（寄る）', () => {
    expect(kenBurnsRect(still(0.5, 0.5, 1.2), 0, SRC.w, SRC.h, DST.w, DST.h)).toEqual({
      sx: 1296.875,
      sy: 250,
      sw: 1406.25,
      sh: 2500,
    })
  })

  it('中心を端に寄せても矩形は写真の外に出ない', () => {
    expect(kenBurnsRect(still(0, 0.5, 1), 0, SRC.w, SRC.h, DST.w, DST.h).sx).toBe(0)
    expect(kenBurnsRect(still(1, 0.5, 1), 0, SRC.w, SRC.h, DST.w, DST.h).sx).toBe(2312.5)
  })

  it('zoom が 1 未満（写真の外が見える）は 1 に丸める', () => {
    expect(kenBurnsRect(still(0.5, 0.5, 0.5), 0, SRC.w, SRC.h, DST.w, DST.h).sw).toBe(1687.5)
  })

  it('from から to へ easeInOut で補間する（zoomIn の中間は zoom 1.1）', () => {
    const rect = kenBurnsRect(kenBurnsPreset('zoomIn'), 0.5, SRC.w, SRC.h, DST.w, DST.h)
    expect(rect.sw).toBeCloseTo(1687.5 / 1.1)
    expect(rect.sh).toBeCloseTo(3000 / 1.1)
  })

  it('進行度 0 は from、1 は to', () => {
    const kb = kenBurnsPreset('zoomIn')
    expect(kenBurnsRect(kb, 0, SRC.w, SRC.h, DST.w, DST.h).sw).toBe(1687.5)
    expect(kenBurnsRect(kb, 1, SRC.w, SRC.h, DST.w, DST.h).sw).toBe(1687.5 / 1.2)
  })
})

describe('kenBurnsPreset（チップで選ぶ既定の動き）', () => {
  it('none は動かない', () => {
    const kb = kenBurnsPreset('none')
    expect(kb.from).toEqual(kb.to)
    expect(kb.from.zoom).toBe(1)
  })

  it('zoomIn は 1 → 1.2、zoomOut はその逆', () => {
    expect(kenBurnsPreset('zoomIn')).toMatchObject({ from: { zoom: 1 }, to: { zoom: 1.2 } })
    expect(kenBurnsPreset('zoomOut')).toMatchObject({ from: { zoom: 1.2 }, to: { zoom: 1 } })
  })

  it('panLR は左から右へ、panRL はその逆（zoom は同じ）', () => {
    const lr = kenBurnsPreset('panLR')
    const rl = kenBurnsPreset('panRL')
    expect(lr.from.cx).toBeLessThan(lr.to.cx)
    expect(rl.from.cx).toBeGreaterThan(rl.to.cx)
    expect(lr.from.zoom).toBe(rl.from.zoom)
  })

  it('パンの振れ幅は zoom で空く余白ちょうど（どんな縦横比の写真でも端で止まらず一定の速さで動く）', () => {
    const lr = kenBurnsPreset('panLR')
    const margin = (1 - 1 / lr.from.zoom) / 2
    expect(lr.from.cx).toBeCloseTo(0.5 - margin)
    expect(lr.to.cx).toBeCloseTo(0.5 + margin)
    // 出力と同じ縦横比の写真（余白が zoom 分しかない）でも、両端でクランプされない
    const w = 1080
    const h = 1920
    const start = kenBurnsRect(lr, 0, w, h, w, h)
    const end = kenBurnsRect(lr, 1, w, h, w, h)
    expect(start.sx).toBeCloseTo(0)
    expect(end.sx).toBeCloseTo(w - end.sw)
    // 中間は線形に進む（easeInOut(0.5) = 0.5）
    expect(kenBurnsRect(lr, 0.5, w, h, w, h).sx).toBeCloseTo((w - end.sw) / 2)
  })

  it('未知の presetId（古い保存データなど）は none として扱う', () => {
    expect(kenBurnsPreset('zoom' as KenBurns['presetId'])).toEqual(kenBurnsPreset('none'))
  })
})
