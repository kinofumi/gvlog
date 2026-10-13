import { describe, expect, it } from 'vitest'
import { captionAlpha, captionFontSize, layoutCaption, wrapText } from './caption'

/** テスト用の文字幅: 全角は 10、半角は 5 */
const measure = (text: string) =>
  [...text].reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 5 : 10), 0)

describe('wrapText（文字単位の折り返し。日本語は単語で切れないため）', () => {
  it('収まる文はそのまま 1 行', () => {
    expect(wrapText('清水寺', 100, measure)).toEqual(['清水寺'])
  })

  it('幅を超えたら文字の途中でも次の行へ', () => {
    expect(wrapText('京都の清水寺に行きました', 50, measure)).toEqual([
      '京都の清水',
      '寺に行きま',
      'した',
    ])
  })

  it('改行はそのまま行の区切りになる', () => {
    expect(wrapText('清水寺\n紅葉', 100, measure)).toEqual(['清水寺', '紅葉'])
  })

  it('空文字は 0 行', () => {
    expect(wrapText('', 100, measure)).toEqual([])
  })

  it('1 文字も入らない幅でも、1 行に 1 文字は置く（無限ループしない）', () => {
    expect(wrapText('あい', 1, measure)).toEqual(['あ', 'い'])
  })
})

describe('captionFontSize（L / M / S は出力の高さの 7.5 / 6 / 4.5%）', () => {
  it('1920 の高さなら 144 / 115.2 / 86.4', () => {
    expect(captionFontSize('L', 1920)).toBe(144)
    expect(captionFontSize('M', 1920)).toBeCloseTo(115.2)
    expect(captionFontSize('S', 1920)).toBeCloseTo(86.4)
  })
})

describe('layoutCaption（各行の中心座標。幅 90%、上下セーフマージン 8%、行間 1.3）', () => {
  const W = 1000
  const H = 2000

  it('下: 最後の行の下端がセーフマージン（8%）に接する', () => {
    const layout = layoutCaption(['一行目', '二行目'], 'bottom', 100, W, H)
    expect(layout.maxWidth).toBe(900)
    expect(layout.lines).toEqual([
      { text: '一行目', x: 500, y: 2000 - 160 - 130 - 50 },
      { text: '二行目', x: 500, y: 2000 - 160 - 50 },
    ])
  })

  it('上: 最初の行の上端がセーフマージンに接する', () => {
    const layout = layoutCaption(['一行目'], 'top', 100, W, H)
    expect(layout.lines).toEqual([{ text: '一行目', x: 500, y: 160 + 50 }])
  })

  it('中央: 行の塊の中心が画面の中心', () => {
    const layout = layoutCaption(['一行目', '二行目'], 'middle', 100, W, H)
    // 塊の高さ = 100 + 130 = 230。中心 1000 → 上端 885
    expect(layout.lines.map((l) => l.y)).toEqual([885 + 50, 885 + 130 + 50])
  })
})

describe('captionAlpha（表示区間の両端で 8 フレームのフェード）', () => {
  // 表示区間 [100, 200)
  it('区間の外は 0', () => {
    expect(captionAlpha(99, 100, 200)).toBe(0)
    expect(captionAlpha(200, 100, 200)).toBe(0)
  })

  it('入りは 8 フレームかけて 1 に、出は 8 フレームかけて 0 に', () => {
    expect(captionAlpha(100, 100, 200)).toBe(0)
    expect(captionAlpha(104, 100, 200)).toBe(0.5)
    expect(captionAlpha(108, 100, 200)).toBe(1)
    expect(captionAlpha(150, 100, 200)).toBe(1)
    expect(captionAlpha(196, 100, 200)).toBe(0.5)
    expect(captionAlpha(199, 100, 200)).toBeCloseTo(0.125)
  })

  it('区間が短いときは入りと出が重なっても 0 以上', () => {
    expect(captionAlpha(104, 100, 108)).toBeGreaterThanOrEqual(0)
  })
})
