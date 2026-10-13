import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PRESET } from '../model/defaults'
import type { ProvidedImage } from '../render/renderFrame'
import { addItems, createProject, type PhotoInfo } from '../state/projectActions'
import type { FrameEncoder } from './encoder'
import { compileTimeline } from '../timeline/compile'
import { ExportCancelled, exportFrames } from './exportVideo'
import type { ExportFrameProvider } from './frameProvider'

// 30 フレーム（1 秒）の短いプリセットでループを確かめる
const preset = { ...DEFAULT_PRESET, totalFrames: 30 }
const info: PhotoInfo = {
  kind: 'photo',
  blobKey: 'b',
  thumbKey: 't',
  fileName: 'a.jpg',
  width: 200,
  height: 100,
}
const project = addItems(createProject(preset, { memberName: '', spot: '' }), [
  { itemId: 'p1', info },
  { itemId: 'p2', info },
])
const signalOf = () => new AbortController().signal
const compiled = compileTimeline(project.items)

function solid(color: string): ProvidedImage {
  const c = createCanvas(200, 100)
  const x = c.getContext('2d')
  x.fillStyle = color
  x.fillRect(0, 0, 200, 100)
  return { image: c as unknown as CanvasImageSource, width: 200, height: 100 }
}

function fakeProvider(failAt?: number) {
  const provider: ExportFrameProvider & { prepared: number[]; disposed: boolean } = {
    prepared: [],
    disposed: false,
    async prepare(frame) {
      if (frame === failAt) throw new Error('デコード失敗')
      this.prepared.push(frame)
    },
    get: () => solid('#f00'),
    async dispose() {
      this.disposed = true
    },
  }
  return provider
}

function fakeEncoder() {
  const encoder: FrameEncoder & { added: number[]; cancelled: boolean; finalized: boolean } = {
    added: [],
    cancelled: false,
    finalized: false,
    async start() {},
    async add(timeSec) {
      this.added.push(Math.round(timeSec * preset.fps))
    },
    async finalize() {
      this.finalized = true
      return new Blob(['mp4'], { type: 'video/mp4' })
    },
    async cancel() {
      this.cancelled = true
    },
    usedCodecString: () => 'avc1.42E028',
  }
  return encoder
}

function ctx() {
  return createCanvas(90, 160).getContext('2d') as unknown as CanvasRenderingContext2D
}

describe('exportFrames（書き出しのループ）', () => {
  it('全フレームを順に用意して描き、エンコードし、finalize の結果を返す', async () => {
    const provider = fakeProvider()
    const encoder = fakeEncoder()
    const blob = await exportFrames(
      project,
      { compiled, ctx: ctx(), provider, encoder },
      vi.fn(),
      signalOf(),
    )
    expect(blob.type).toBe('video/mp4')
    expect(provider.prepared).toEqual(Array.from({ length: 30 }, (_, i) => i))
    expect(encoder.added).toEqual(Array.from({ length: 30 }, (_, i) => i))
    expect(encoder.finalized).toBe(true)
    expect(provider.disposed).toBe(true)
  })

  it('進捗は 10 フレームごとと最後に通知される', async () => {
    const progress = vi.fn()
    await exportFrames(
      project,
      { compiled, ctx: ctx(), provider: fakeProvider(), encoder: fakeEncoder() },
      progress,
      signalOf(),
    )
    expect(progress.mock.calls.map((c) => c[0].frame)).toEqual([0, 10, 20, 30])
  })

  it('「用意 → 描く → エンコード」の順を守り、エンコード時のキャンバスには用意した画像が描かれている', async () => {
    const events: string[] = []
    const c = createCanvas(90, 160)
    const context = c.getContext('2d') as unknown as CanvasRenderingContext2D
    const colors = ['#f00', '#0f0']
    let n = 0
    const provider: ExportFrameProvider = {
      async prepare(frame) {
        // 非同期の待ちを模す。終わる前に描かれていないことを events の順で確かめる
        await new Promise((r) => setTimeout(r, 1))
        events.push(`prepare ${frame}`)
        n = frame
      },
      get: () => solid(colors[n % 2]),
      async dispose() {},
    }
    const encoder = fakeEncoder()
    encoder.add = async (timeSec) => {
      const frame = Math.round(timeSec * preset.fps)
      const [r, g] = c.getContext('2d').getImageData(45, 80, 1, 1).data
      events.push(`add ${frame} ${r > 200 ? 'red' : g > 200 ? 'green' : '?'}`)
      await new Promise((res) => setTimeout(res, 1))
      events.push(`added ${frame}`)
    }
    const two = { ...project, preset: { ...preset, totalFrames: 2 } }
    await exportFrames(
      two,
      { compiled: compileTimeline(two.items), ctx: context, provider, encoder },
      () => {},
      signalOf(),
    )
    expect(events).toEqual([
      'prepare 0',
      'add 0 red',
      'added 0',
      'prepare 1',
      'add 1 green',
      'added 1',
    ])
  })

  it('キャンセルすると ExportCancelled を投げ、エンコーダを止めてデコーダを解放する', async () => {
    const provider = fakeProvider()
    const encoder = fakeEncoder()
    const controller = new AbortController()
    const original = provider.prepare.bind(provider)
    provider.prepare = async (frame) => {
      if (frame === 5) controller.abort()
      await original(frame)
    }
    await expect(
      exportFrames(
        project,
        { compiled, ctx: ctx(), provider, encoder },
        () => {},
        controller.signal,
      ),
    ).rejects.toBeInstanceOf(ExportCancelled)
    expect(encoder.cancelled).toBe(true)
    expect(encoder.finalized).toBe(false)
    expect(provider.disposed).toBe(true)
  })

  it('最後のフレームのあとにキャンセルされても成功にしない', async () => {
    const encoder = fakeEncoder()
    const controller = new AbortController()
    encoder.add = async () => {
      if (encoder.added.push(0) === 30) controller.abort()
    }
    await expect(
      exportFrames(
        project,
        { compiled, ctx: ctx(), provider: fakeProvider(), encoder },
        () => {},
        controller.signal,
      ),
    ).rejects.toBeInstanceOf(ExportCancelled)
    expect(encoder.finalized).toBe(false)
  })

  it('finalize を待っている間にキャンセルされたら、Blob があってもキャンセルにする', async () => {
    const encoder = fakeEncoder()
    const controller = new AbortController()
    encoder.finalize = async () => {
      controller.abort()
      encoder.finalized = true
      return new Blob(['mp4'])
    }
    await expect(
      exportFrames(
        project,
        { compiled, ctx: ctx(), provider: fakeProvider(), encoder },
        () => {},
        controller.signal,
      ),
    ).rejects.toBeInstanceOf(ExportCancelled)
  })

  it('フレームの用意に失敗したら、そのフレームはエンコードせず、使った設定を含めた失敗として止める', async () => {
    const provider = fakeProvider(7)
    const encoder = fakeEncoder()
    await expect(
      exportFrames(project, { compiled, ctx: ctx(), provider, encoder }, () => {}, signalOf()),
    ).rejects.toThrow('デコード失敗（avc1.42E028）')
    expect(encoder.added).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(encoder.cancelled).toBe(true)
    expect(provider.disposed).toBe(true)
  })

  it('後始末（デコーダの解放）に失敗しても、元の失敗を残して併記する', async () => {
    const provider = fakeProvider(3)
    provider.dispose = async () => {
      throw new Error('解放できない')
    }
    await expect(
      exportFrames(
        project,
        { compiled, ctx: ctx(), provider, encoder: fakeEncoder() },
        () => {},
        signalOf(),
      ),
    ).rejects.toThrow(/デコード失敗.*後始末にも失敗: 解放できない/)
  })

  it('成功したあとで解放に失敗しても、できた MP4 は捨てず、警告だけ出す', async () => {
    const provider = fakeProvider()
    provider.dispose = async () => {
      throw new Error('解放できない')
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const blob = await exportFrames(
        project,
        { compiled, ctx: ctx(), provider, encoder: fakeEncoder() },
        () => {},
        signalOf(),
      )
      expect(blob.type).toBe('video/mp4')
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('素材が無ければ始める前に失敗する', async () => {
    const empty = createProject(preset, { memberName: '', spot: '' })
    const encoder = fakeEncoder()
    await expect(
      exportFrames(
        empty,
        { compiled, ctx: ctx(), provider: fakeProvider(), encoder },
        () => {},
        signalOf(),
      ),
    ).rejects.toThrow('素材がありません')
    expect(encoder.added).toEqual([])
  })
})
