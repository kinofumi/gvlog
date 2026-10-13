import { describe, expect, it } from 'vitest'
import { captionAlpha, captionFontSize, captionMaxWidth, layoutCaption, wrapText } from './caption'

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

  it('意図した空行（連続する改行、先頭・末尾の改行）は空の行として残す', () => {
    expect(wrapText('前\n\n後', 100, measure)).toEqual(['前', '', '後'])
    expect(wrapText('\n清水寺\n', 100, measure)).toEqual(['', '清水寺', ''])
  })

  it('1 文字も入らない幅でも、1 行に 1 文字は置く（無限ループしない）', () => {
    expect(wrapText('あい', 1, measure)).toEqual(['あ', 'い'])
  })

  it('結合文字や ZWJ 絵文字は 1 文字として扱い、途中で分断しない', () => {
    // 家族の絵文字（ZWJ で 3 つを結合）と、異体字セレクタ付きのハート
    const family = '👨\u200d👩\u200d👧'
    const heart = '❤\ufe0f'
    const lines = wrapText(`あ${family}${heart}い`, 25, measure)
    expect(lines.join('')).toBe(`あ${family}${heart}い`)
    for (const line of lines) {
      expect(line.includes('\u200d') ? line.includes(family) : true).toBe(true)
      expect(line.includes('\ufe0f') ? line.includes(heart) : true).toBe(true)
    }
  })

  it('Windows の改行（CR LF）も改行として扱い、CR を残さない', () => {
    expect(wrapText('前\r\n後', 100, measure)).toEqual(['前', '後'])
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

  it('幅は画面幅の 90%（折り返す前に使う値なので別の関数）', () => {
    expect(captionMaxWidth(W)).toBe(900)
  })

  it('下: 最後の行の下端がセーフマージン（8%）に接する', () => {
    const layout = layoutCaption(['一行目', '二行目'], 'bottom', 100, W, H)
    expect(layout.lines).toEqual([
      { text: '一行目', x: 500, y: 2000 - 160 - 130 - 50 },
      { text: '二行目', x: 500, y: 2000 - 160 - 50 },
    ])
  })

  it('上: 最初の行の上端がセーフマージンに接する', () => {
    const layout = layoutCaption(['一行目'], 'top', 100, W, H)
    expect(layout.lines).toEqual([{ text: '一行目', x: 500, y: 160 + 50 }])
  })

  it('セーフマージンに収まらない行は切り捨て、overflow で知らせる（文字サイズは変えない）', () => {
    // 使える高さ 2000 × 0.84 = 1680。文字 100 + 行間 130 × (n − 1) ≤ 1680 → 最大 13 行
    const thirteen = Array.from({ length: 13 }, (_, i) => `行${i + 1}`)
    expect(layoutCaption(thirteen, 'top', 100, W, H)).toMatchObject({ overflow: false })
    expect(layoutCaption(thirteen, 'top', 100, W, H).lines).toHaveLength(13)
    const fourteen = [...thirteen, '行14']
    const layout = layoutCaption(fourteen, 'bottom', 100, W, H)
    expect(layout.overflow).toBe(true)
    expect(layout.lines).toHaveLength(13)
    expect(layout.lines[0].y).toBeGreaterThanOrEqual(160 + 50)
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

  it('入りと出は対称: 最初の 8 フレームで 1/8 ずつ上がり、最後の 8 フレームで 1/8 ずつ下がる', () => {
    expect(captionAlpha(100, 100, 200)).toBe(0.125)
    expect(captionAlpha(103, 100, 200)).toBe(0.5)
    expect(captionAlpha(107, 100, 200)).toBe(1)
    expect(captionAlpha(150, 100, 200)).toBe(1)
    expect(captionAlpha(192, 100, 200)).toBe(1)
    expect(captionAlpha(196, 100, 200)).toBe(0.5)
    expect(captionAlpha(199, 100, 200)).toBe(0.125)
  })

  it('最低表示長 16 フレームなら、ちょうど入り 8 と出 8 で山が 1 に届く', () => {
    expect(captionAlpha(107, 100, 116)).toBe(1)
    expect(captionAlpha(108, 100, 116)).toBe(1)
  })

  it('区間が短いときは入りと出が重なっても 0 以上', () => {
    expect(captionAlpha(104, 100, 108)).toBeGreaterThanOrEqual(0)
  })
})
