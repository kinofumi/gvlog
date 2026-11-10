import { describe, expect, it, vi } from 'vitest'
import type { ImportedVideo } from '../media/importVideo'
import { DEFAULT_PRESET } from '../model/defaults'
import type { PhotoInfo, VideoInfo } from '../model/types'
import { compileTimeline } from '../timeline/compile'
import {
  addItems,
  createProject,
  setItemDuration,
  setTransition,
  setTrimStart,
} from '../state/projectActions'
import type { FrameSource } from './frameSource'
import { createVideoSources } from './videoSources'

const photo: PhotoInfo = {
  kind: 'photo',
  blobKey: 'b',
  thumbKey: 't',
  fileName: 'a.jpg',
  width: 200,
  height: 100,
}
const video: VideoInfo = { ...photo, kind: 'video', fileName: 'v.mov', sourceDurationFrames: 900 }
const imported = (name: string) => ({ fileName: name }) as unknown as ImportedVideo
const empty = () => createProject(DEFAULT_PRESET, { memberName: '', spot: '' })

/** 受け取った引数を覚え、dispose の呼び出しを数えるフェイク */
function fakeSource(args: unknown[]): FrameSource & { args: unknown[]; disposed: number } {
  return {
    args,
    disposed: 0,
    async prepare() {},
    get: () => ({}) as CanvasImageSource,
    width: () => 0,
    height: () => 0,
    async dispose() {
      this.disposed++
    },
  }
}

describe('createVideoSources（動画素材ごとにデコーダを組み立てる）', () => {
  it('写真だけなら空', async () => {
    const p = addItems(empty(), [{ itemId: 'p1', info: photo }])
    const sources = await createVideoSources(compileTimeline(p.items), p.items, {}, 450, () =>
      fakeSource([]),
    )
    expect(sources.size).toBe(0)
  })

  it('動画には見える区間（クロスフェード込み）と開始位置を渡す', async () => {
    let p = addItems(empty(), [
      { itemId: 'p1', info: photo },
      { itemId: 'v1', info: video },
    ])
    p = setTransition(p, 'p1', { type: 'crossfade', durationFrames: 30 })
    p = setTrimStart(p, 'v1', 60)
    const v1 = imported('v.mov')
    const sources = await createVideoSources(
      compileTimeline(p.items),
      p.items,
      { v1 },
      450,
      (...args) => fakeSource(args),
    )
    expect([...sources.keys()]).toEqual(['v1'])
    // 動画は 225 から始まるが、クロスフェードで 15 フレーム早く見え始める
    expect((sources.get('v1') as ReturnType<typeof fakeSource>).args).toEqual([v1, 210, 450, 60])
  })

  it('出力の長さより後ろの動画は作らず、またぐ動画は区間を出力の長さで切る（レビュー: Claude 3）', async () => {
    // v1: 0〜450、v2: 450〜480（上限 450 の外）、v3 は無し。v1 を 480 まで伸ばすと v2 が 480〜 になる
    let p = addItems(empty(), [
      { itemId: 'v1', info: video },
      { itemId: 'v2', info: video },
    ])
    p = setItemDuration(p, 'v1', 480)
    const make = vi.fn((...args: unknown[]) => fakeSource(args))
    const sources = await createVideoSources(
      compileTimeline(p.items),
      p.items,
      { v1: imported('a.mov'), v2: imported('b.mov') },
      450,
      make,
    )
    expect([...sources.keys()]).toEqual(['v1'])
    expect(make.mock.calls[0].slice(1)).toEqual([0, 450, 0])
  })

  it('動画の実体が無ければ分かるエラーで止め、先に作った分は解放する', async () => {
    const p = addItems(empty(), [
      { itemId: 'v1', info: video },
      { itemId: 'v2', info: { ...video, fileName: 'missing.mov' } },
    ])
    const made: ReturnType<typeof fakeSource>[] = []
    const make = vi.fn((...args: unknown[]) => {
      const s = fakeSource(args)
      made.push(s)
      return s
    })
    await expect(
      createVideoSources(compileTimeline(p.items), p.items, { v1: imported('v.mov') }, 450, make),
    ).rejects.toThrow('missing.mov')
    expect(made).toHaveLength(1)
    expect(made[0].disposed).toBe(1)
  })
})
