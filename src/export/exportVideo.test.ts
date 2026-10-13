import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PRESET } from '../model/defaults'
import type { ProvidedImage } from '../render/renderFrame'
import { addPhotos, createProject } from '../state/projectActions'
import type { FrameEncoder } from './encoder'
import { ExportCancelled, exportFrames } from './exportVideo'
import type { ExportFrameProvider } from './frameProvider'

// 30 フレーム（1 秒）の短いプリセットでループを確かめる
const preset = { ...DEFAULT_PRESET, totalFrames: 30 }
const info = { blobKey: 'b', thumbKey: 't', fileName: 'a.jpg', width: 200, height: 100 }
const project = addPhotos(createProject(preset, { memberName: '', spot: '' }), [
  { itemId: 'p1', info },
  { itemId: 'p2', info },
])

function solid(color: string): ProvidedImage {
  const c = createCanvas(200, 100)
  const x = c.getContext('2d')
  x.fillStyle = color
  x.fillRect(0, 0, 200, 100)
  return { image: c as unknown as CanvasImageSource, width: 200, height: 100 }
}

function fakeProvider(failAt?: number) {
  const prepared: number[] = []
  const provider: ExportFrameProvider & { prepared: number[]; disposed: boolean } = {
    prepared,
    disposed: false,
    async prepare(frame) {
      if (frame === failAt) throw new Error('デコード失敗')
      prepared.push(frame)
    },
    get: () => solid('#f00'),
    async dispose() {
      this.disposed = true
    },
  }
  return provider
}

function fakeEncoder() {
  const added: number[] = []
  const encoder: FrameEncoder & { added: number[]; cancelled: boolean; finalized: boolean } = {
    added,
    cancelled: false,
    finalized: false,
    async start() {},
    async add(timeSec) {
      added.push(Math.round(timeSec * preset.fps))
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
    const progress = vi.fn()
    const blob = await exportFrames(
      project,
      { ctx: ctx(), provider, encoder },
      progress,
      new AbortController().signal,
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
      { ctx: ctx(), provider: fakeProvider(), encoder: fakeEncoder() },
      progress,
      new AbortController().signal,
    )
    expect(progress.mock.calls.map((c) => c[0].frame)).toEqual([0, 10, 20, 30])
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
      exportFrames(project, { ctx: ctx(), provider, encoder }, () => {}, controller.signal),
    ).rejects.toBeInstanceOf(ExportCancelled)
    expect(encoder.cancelled).toBe(true)
    expect(encoder.finalized).toBe(false)
    expect(provider.disposed).toBe(true)
  })

  it('最後のフレームのあとにキャンセルされても成功にしない', async () => {
    const provider = fakeProvider()
    const encoder = fakeEncoder()
    const controller = new AbortController()
    encoder.add = async () => {
      if (encoder.added.push(0) === 30) controller.abort()
    }
    await expect(
      exportFrames(project, { ctx: ctx(), provider, encoder }, () => {}, controller.signal),
    ).rejects.toBeInstanceOf(ExportCancelled)
    expect(encoder.finalized).toBe(false)
  })

  it('フレームの用意に失敗したら、使った設定を含めた失敗として止める（黒フレームを出さない）', async () => {
    const provider = fakeProvider(7)
    const encoder = fakeEncoder()
    await expect(
      exportFrames(
        project,
        { ctx: ctx(), provider, encoder },
        () => {},
        new AbortController().signal,
      ),
    ).rejects.toThrow('デコード失敗（avc1.42E028）')
    expect(encoder.cancelled).toBe(true)
    expect(provider.disposed).toBe(true)
  })

  it('素材が無ければ始める前に失敗する', async () => {
    const empty = createProject(preset, { memberName: '', spot: '' })
    const encoder = fakeEncoder()
    await expect(
      exportFrames(
        empty,
        { ctx: ctx(), provider: fakeProvider(), encoder },
        () => {},
        new AbortController().signal,
      ),
    ).rejects.toThrow('素材がありません')
    expect(encoder.added).toEqual([])
  })
})
