import { describe, expect, it } from 'vitest'
import { compileTimeline } from '../timeline/compile'
import { createFrameProvider } from './frameProvider'
import type { FrameSource } from './frameSource'

function fakeSource(failDispose = false) {
  const source: FrameSource & { prepared: number[]; disposed: boolean } = {
    prepared: [],
    disposed: false,
    async prepare(frame) {
      this.prepared.push(frame)
    },
    get: () => ({}) as CanvasImageSource,
    width: () => 1080,
    height: () => 1920,
    async dispose() {
      this.disposed = true
      if (failDispose) throw new Error('解放できない')
    },
  }
  return source
}

describe('createFrameProvider（書き出し中の画像の供給）', () => {
  const compiled = compileTimeline([
    { itemId: 'v1', durationFrames: 150, transitionOut: { type: 'crossfade', durationFrames: 10 } },
    { itemId: 'v2', durationFrames: 150 },
  ])

  it('そのフレームで見える動画だけ prepare する（トランジション中は 2 本）', async () => {
    const v1 = fakeSource()
    const v2 = fakeSource()
    const provider = createFrameProvider(
      compiled,
      {},
      new Map([
        ['v1', v1],
        ['v2', v2],
      ]),
    )
    await provider.prepare(0)
    await provider.prepare(150)
    await provider.prepare(200)
    expect(v1.prepared).toEqual([0, 150])
    expect(v2.prepared).toEqual([150, 200])
  })

  it('画像が無い写真はエラー', () => {
    const provider = createFrameProvider(compiled, {}, new Map())
    expect(() => provider.get('p1')).toThrow('画像がありません')
  })

  it('1 つの解放が失敗しても残りを解放し、失敗をまとめて投げる', async () => {
    const v1 = fakeSource(true)
    const v2 = fakeSource()
    const provider = createFrameProvider(
      compiled,
      {},
      new Map([
        ['v1', v1],
        ['v2', v2],
      ]),
    )
    await expect(provider.dispose()).rejects.toThrow('1 件失敗')
    expect(v2.disposed).toBe(true)
  })
})
