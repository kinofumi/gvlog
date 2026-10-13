import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
import type { Caption } from '../model/types'
import { compileTimeline } from '../timeline/compile'
import { renderFrame, type ProvidedImage, type RenderItem } from './renderFrame'

// Node で Canvas を動かすために @napi-rs/canvas を使う。描画 API はブラウザと同じ。
// 型はブラウザのものに合わせてキャストする（ブラウザの Safari で同じ色になる証明にはならない）。
const W = 90
const H = 160

function solid(color: string, w = 200, h = 100): ProvidedImage {
  const c = createCanvas(w, h)
  const x = c.getContext('2d')
  x.fillStyle = color
  x.fillRect(0, 0, w, h)
  return { image: c as unknown as CanvasImageSource, width: w, height: h }
}

/** 左半分が赤、右半分が青の写真 */
function leftRedRightBlue(w = 200, h = 100): ProvidedImage {
  const c = createCanvas(w, h)
  const x = c.getContext('2d')
  x.fillStyle = '#f00'
  x.fillRect(0, 0, w / 2, h)
  x.fillStyle = '#00f'
  x.fillRect(w / 2, 0, w / 2, h)
  return { image: c as unknown as CanvasImageSource, width: w, height: h }
}

function render(items: RenderItem[], images: Record<string, ProvidedImage>, frame: number) {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  const compiled = compileTimeline(items)
  renderFrame(compiled, items, frame, ctx, { get: (id) => images[id] })
  return (x: number, y: number) => [...canvas.getContext('2d').getImageData(x, y, 1, 1).data]
}

const photo = (
  itemId: string,
  durationFrames: number,
  extra: Partial<RenderItem> = {},
): RenderItem => ({
  itemId,
  kind: 'photo',
  durationFrames,
  ...extra,
})

describe('renderFrame（1 フレームの合成）', () => {
  it('素材が無いフレームは黒', () => {
    const px = render([], {}, 0)
    expect(px(10, 10)).toEqual([0, 0, 0, 255])
  })

  it('呼び出し前の描画状態（半透明など）に影響されず、終わったら元の状態に戻す', () => {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
    // 前のフレームの残りを模す: 赤で塗ってから半透明にしておく
    ctx.fillStyle = '#f00'
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 0.5
    ctx.globalCompositeOperation = 'lighter'
    renderFrame(compileTimeline([]), [], 0, ctx, { get: () => solid('#0f0') })
    expect([...canvas.getContext('2d').getImageData(10, 10, 1, 1).data]).toEqual([0, 0, 0, 255])
    expect(ctx.globalAlpha).toBeCloseTo(0.5, 2) // Node の Canvas は 8bit に丸めて戻す
    expect(ctx.globalCompositeOperation).toBe('lighter')
  })

  it('写真 1 枚は画面いっぱいに描かれる', () => {
    const px = render([photo('a', 300)], { a: solid('#f00') }, 100)
    expect(px(0, 0)).toEqual([255, 0, 0, 255])
    expect(px(W - 1, H - 1)).toEqual([255, 0, 0, 255])
  })

  it('crossfade は前を不透明、後を進行度の不透明度で重ねる（同じ画像同士なら輝度が変わらない）', () => {
    const items = [
      photo('a', 150, { transitionOut: { type: 'crossfade', durationFrames: 10 } }),
      photo('b', 150),
    ]
    const red = solid('#f00')
    // 区間 [145, 155) の中央 150 は進行度 0.5
    const px = render(items, { a: red, b: red }, 150)
    expect(px(45, 80)).toEqual([255, 0, 0, 255])
  })

  it('crossfade の中間では 2 色が半分ずつ混ざる', () => {
    const items = [
      photo('a', 150, { transitionOut: { type: 'crossfade', durationFrames: 10 } }),
      photo('b', 150),
    ]
    const [r, g, b] = render(items, { a: solid('#f00'), b: solid('#00f') }, 150)(45, 80)
    expect(r).toBeGreaterThan(120)
    expect(r).toBeLessThan(136)
    expect(g).toBe(0)
    expect(b).toBeGreaterThan(120)
    expect(b).toBeLessThan(136)
  })

  it('Ken Burns の中心を左端にすると左側（赤）が、右端にすると右側（青）が見える', () => {
    const at = (cx: number) =>
      render(
        [
          photo('a', 300, {
            kenBurns: {
              presetId: 'none',
              from: { cx, cy: 0.5, zoom: 1 },
              to: { cx, cy: 0.5, zoom: 1 },
            },
          }),
        ],
        { a: leftRedRightBlue() },
        0,
      )(45, 80)
    expect(at(0)).toEqual([255, 0, 0, 255])
    expect(at(1)).toEqual([0, 0, 255, 255])
  })

  it('画像の寸法は ImageProvider が返す値を使う（書き出しの動画は出力サイズに cover 済みのキャンバスを返す）', () => {
    const video: RenderItem = { itemId: 'v', kind: 'video', durationFrames: 300 }
    // 出力サイズと同じ寸法の画像なら、そのまま（二重クロップなし）
    const px = render([video], { v: leftRedRightBlue(W, H) }, 0)
    expect(px(2, 80)).toEqual([255, 0, 0, 255])
    expect(px(W - 3, 80)).toEqual([0, 0, 255, 255])
  })

  it('動画は中央を cover で描く（Ken Burns なし）', () => {
    const video: RenderItem = {
      itemId: 'v',
      kind: 'video',
      durationFrames: 300,
    }
    const px = render([video], { v: leftRedRightBlue() }, 0)
    // 幅 200 のうち中央の 56.25 を使うので、左寄りは赤、右寄りは青
    expect(px(10, 80)).toEqual([255, 0, 0, 255])
    expect(px(80, 80)).toEqual([0, 0, 255, 255])
  })

  const caption: Caption = {
    text: 'テスト',
    presetId: 'band',
    position: 'bottom',
    size: 'L',
    overrides: { bgColor: '#000', textColor: '#fff' },
    inOffsetFrames: 0,
    outOffsetFrames: 0,
  }

  it('キャプションは合成のあとに描かれる（帯は crossfade の混色に巻き込まれない）', () => {
    const items = [
      photo('a', 150, { transitionOut: { type: 'crossfade', durationFrames: 30 }, caption }),
      photo('b', 150),
    ]
    // トランジション区間 [135, 165) の 140 は a のコア区間（〜150）の中で、キャプションはフェード前（不透明度 1）
    const px = render(items, { a: solid('#f00'), b: solid('#00f') }, 140)
    const bandY = Math.round(H - H * 0.08 - (H * 0.075) / 2)
    // 帯の外は 2 色が混ざっているが、帯の中（文字の無い端）は帯の色そのまま
    expect(px(45, 20)[2]).toBeGreaterThan(0)
    expect(px(2, bandY)).toEqual([0, 0, 0, 255])
  })

  it('キャプションの表示区間の外では描かれない', () => {
    const items = [photo('a', 300, { caption: { ...caption, inOffsetFrames: 100 } })]
    const px = render(items, { a: solid('#f00') }, 50)
    const bandY = Math.round(H - H * 0.08 - (H * 0.075) / 2)
    expect(px(2, bandY)).toEqual([255, 0, 0, 255])
  })

  it('改行や空白だけのテキストは、帯もボックスも描かない', () => {
    const items = [photo('a', 300, { caption: { ...caption, text: '\n  ' } })]
    const px = render(items, { a: solid('#f00') }, 50)
    const bandY = Math.round(H - H * 0.08 - (H * 0.075) / 2)
    expect(px(2, bandY)).toEqual([255, 0, 0, 255])
  })

  it('box は画面の幅からはみ出さない（長い行でも左右の端は背景のまま）', () => {
    const long = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ'
    const items = [photo('a', 300, { caption: { ...caption, presetId: 'box', text: long } })]
    const px = render(items, { a: solid('#f00') }, 50)
    const bandY = Math.round(H - H * 0.08 - (H * 0.075) / 2)
    expect(px(0, bandY)).toEqual([255, 0, 0, 255])
    expect(px(W - 1, bandY)).toEqual([255, 0, 0, 255])
  })

  it('フェードの途中では帯が半透明で重なる', () => {
    const items = [photo('a', 300, { caption })]
    // 表示区間の最初のフレームは不透明度 1/8
    const [r] = render(
      items,
      { a: solid('#f00') },
      0,
    )(2, Math.round(H - H * 0.08 - (H * 0.075) / 2))
    expect(r).toBeGreaterThan(200)
    expect(r).toBeLessThan(255)
  })
})
