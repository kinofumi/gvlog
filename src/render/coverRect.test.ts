import { describe, expect, it } from 'vitest'
import { coverRect } from './coverRect'

describe('coverRect（cover フィットで切り出す元画像の矩形）', () => {
  it('縦長の出力に横長の画像を入れると、左右を切り落として中央を使う', () => {
    // 画像 4000x3000 を 1080x1920 に cover で入れる。高さを合わせると幅は 3000 * 1080 / 1920 = 1687.5
    expect(coverRect(4000, 3000, 1080, 1920)).toEqual({
      sx: 1156.25,
      sy: 0,
      sw: 1687.5,
      sh: 3000,
    })
  })

  it('同じ縦横比なら全体を使う', () => {
    expect(coverRect(1080, 1920, 1080, 1920)).toEqual({ sx: 0, sy: 0, sw: 1080, sh: 1920 })
  })

  it('横長の出力に縦長の画像を入れると、上下を切り落とす', () => {
    expect(coverRect(1080, 1920, 1920, 1080)).toEqual({
      sx: 0,
      sy: 656.25,
      sw: 1080,
      sh: 607.5,
    })
  })
})
