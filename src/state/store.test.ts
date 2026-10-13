import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore, type LoadedImage } from './store'

function fakeImage(): LoadedImage {
  return { image: { close: vi.fn() } as unknown as ImageBitmap, width: 400, height: 300 }
}
const info = { blobKey: 'b', thumbKey: 't', fileName: 'a.jpg', width: 400, height: 300 }

describe('useAppStore（画像の所有と UI 状態）', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
  })

  it('写真を追加すると素材と画像が入り、外すと画像を閉じて消す', () => {
    const img = fakeImage()
    useAppStore.getState().addPhoto('p1', info, img)
    expect(useAppStore.getState().project.items.map((i) => i.itemId)).toEqual(['p1'])
    expect(useAppStore.getState().images.p1).toBe(img)

    useAppStore.getState().select('p1')
    useAppStore.getState().removeItem('p1')
    expect(useAppStore.getState().project.items).toEqual([])
    expect(useAppStore.getState().images.p1).toBeUndefined()
    expect(img.image.close).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().ui.selectedItemId).toBeNull()
  })

  it('上限で追加できなかったときは、受け取った画像を閉じる', () => {
    for (let i = 1; i <= 10; i++) useAppStore.getState().addPhoto(`p${i}`, info, fakeImage())
    const extra = fakeImage()
    useAppStore.getState().addPhoto('p11', info, extra)
    expect(useAppStore.getState().project.items).toHaveLength(10)
    expect(extra.image.close).toHaveBeenCalledTimes(1)
  })

  it('同じ ID で再追加したときは、素材を増やさず新しい画像だけ閉じる（元の画像は残す）', () => {
    const first = fakeImage()
    const second = fakeImage()
    useAppStore.getState().addPhoto('p1', info, first)
    useAppStore.getState().addPhoto('p1', info, second)
    expect(useAppStore.getState().project.items).toHaveLength(1)
    expect(useAppStore.getState().images.p1).toBe(first)
    expect(first.image.close).not.toHaveBeenCalled()
    expect(second.image.close).toHaveBeenCalledTimes(1)
  })

  it('seek は 0〜totalFrames−1 の整数に収め、数でない値は無視する', () => {
    useAppStore.getState().seek(-5)
    expect(useAppStore.getState().ui.playheadFrame).toBe(0)
    useAppStore.getState().seek(1000)
    expect(useAppStore.getState().ui.playheadFrame).toBe(299)
    useAppStore.getState().seek(10.7)
    expect(useAppStore.getState().ui.playheadFrame).toBe(10)
    useAppStore.getState().seek(Number.NaN)
    expect(useAppStore.getState().ui.playheadFrame).toBe(10)
  })
})
