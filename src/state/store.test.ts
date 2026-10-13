import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportedVideo } from '../media/importVideo'
import type { PhotoInfo, VideoInfo, VideoItem } from '../model/types'
import { useAppStore, type LoadedImage } from './store'

function fakeImage(): LoadedImage {
  return { image: { close: vi.fn() } as unknown as ImageBitmap, width: 400, height: 300 }
}
/** 解放の呼び出しだけ見える動画の偽物 */
function fakeVideo(): ImportedVideo {
  return { input: { dispose: vi.fn() } } as unknown as ImportedVideo
}
const info: PhotoInfo = {
  kind: 'photo',
  blobKey: 'b',
  thumbKey: 't',
  fileName: 'a.jpg',
  width: 400,
  height: 300,
}
const videoInfo: VideoInfo = {
  kind: 'video',
  blobKey: 'b',
  thumbKey: 't',
  fileName: 'a.mov',
  width: 1080,
  height: 1920,
  sourceDurationFrames: 600,
}

/** 写真 1 枚を追加する（テストの短縮用） */
function addPhoto(itemId: string, image: LoadedImage) {
  useAppStore.getState().addItems([{ itemId, info, image }])
}

describe('useAppStore（画像の所有と UI 状態）', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
  })

  it('写真を追加すると素材と画像が入り、外すと画像を閉じて消す', () => {
    const img = fakeImage()
    addPhoto('p1', img)
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
    for (let i = 1; i <= 10; i++) addPhoto(`p${i}`, fakeImage())
    const extra = fakeImage()
    addPhoto('p11', extra)
    expect(useAppStore.getState().project.items).toHaveLength(10)
    expect(extra.image.close).toHaveBeenCalledTimes(1)
  })

  it('同じ ID で再追加したときは、素材を増やさず新しい画像だけ閉じる（元の画像は残す）', () => {
    const first = fakeImage()
    const second = fakeImage()
    addPhoto('p1', first)
    addPhoto('p1', second)
    expect(useAppStore.getState().project.items).toHaveLength(1)
    expect(useAppStore.getState().images.p1).toBe(first)
    expect(first.image.close).not.toHaveBeenCalled()
    expect(second.image.close).toHaveBeenCalledTimes(1)
  })

  it('まとめて追加すると、入った分だけ画像を持ち、入らなかった分は閉じる', () => {
    const imgs = Array.from({ length: 3 }, fakeImage)
    useAppStore.getState().addItems([
      { itemId: 'a', info, image: imgs[0] },
      { itemId: 'a', info, image: imgs[1] },
      { itemId: 'b', info, image: imgs[2] },
    ])
    expect(useAppStore.getState().project.items.map((i) => i.itemId)).toEqual(['a', 'b'])
    expect(useAppStore.getState().images.a).toBe(imgs[0])
    expect(imgs[0].image.close).not.toHaveBeenCalled()
    expect(imgs[1].image.close).toHaveBeenCalledTimes(1)
    expect(imgs[2].image.close).not.toHaveBeenCalled()
  })

  it('再生中に最後の素材を外したら再生を止める', () => {
    addPhoto('p1', fakeImage())
    useAppStore.getState().setPlaying(true)
    useAppStore.getState().removeItem('p1')
    expect(useAppStore.getState().ui.isPlaying).toBe(false)
  })

  it('書き出し中は素材を外せない（使用中の画像を閉じないため）', () => {
    const img = fakeImage()
    addPhoto('p1', img)
    useAppStore.getState().setExporting(true)
    useAppStore.getState().removeItem('p1')
    expect(useAppStore.getState().project.items).toHaveLength(1)
    expect(img.image.close).not.toHaveBeenCalled()
  })

  it('同じフレームへの seek は状態を変えない', () => {
    useAppStore.getState().seek(10)
    const ui = useAppStore.getState().ui
    useAppStore.getState().seek(10)
    expect(useAppStore.getState().ui).toBe(ui)
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

  it('動画を追加するとポスター画像と動画が入り、外すと両方を解放する', () => {
    const img = fakeImage()
    const video = fakeVideo()
    useAppStore.getState().addItems([{ itemId: 'v1', info: videoInfo, image: img, video }])
    expect(useAppStore.getState().project.items[0].kind).toBe('video')
    expect(useAppStore.getState().videos.v1).toBe(video)
    expect(useAppStore.getState().images.v1).toBe(img)

    useAppStore.getState().removeItem('v1')
    expect(useAppStore.getState().videos.v1).toBeUndefined()
    expect(video.input.dispose).toHaveBeenCalledTimes(1)
    expect(img.image.close).toHaveBeenCalledTimes(1)
  })

  it('入らなかった動画は、その場で解放する', () => {
    for (let i = 1; i <= 10; i++) addPhoto(`p${i}`, fakeImage())
    const img = fakeImage()
    const video = fakeVideo()
    useAppStore.getState().addItems([{ itemId: 'v1', info: videoInfo, image: img, video }])
    expect(useAppStore.getState().videos.v1).toBeUndefined()
    expect(video.input.dispose).toHaveBeenCalledTimes(1)
    expect(img.image.close).toHaveBeenCalledTimes(1)
  })

  it('開始位置の設定は projectActions に渡す', () => {
    useAppStore
      .getState()
      .addItems([{ itemId: 'v1', info: videoInfo, image: fakeImage(), video: fakeVideo() }])
    useAppStore.getState().setTrimStart('v1', 100)
    expect((useAppStore.getState().project.items[0] as VideoItem).trimStartFrames).toBe(100)
  })
})
