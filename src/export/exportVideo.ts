import type { Project } from '../model/types'
import type { Ctx } from '../render/ctx'
import { renderFrame, type ProvidedImage } from '../render/renderFrame'
import { compileTimeline } from '../timeline/compile'
import { pickEncoder, EXPORT_BITRATE } from './codec'
import { createMp4Encoder, type FrameEncoder } from './encoder'
import { formatError } from './formatError'
import { createFrameProvider, type ExportFrameProvider } from './frameProvider'
import type { FrameSource } from './frameSource'

export type ExportProgress = {
  frame: number
  totalFrames: number
}

export type ExportResult = {
  blob: Blob
  codecString: string
  elapsedMs: number
}

export class ExportCancelled extends Error {
  constructor() {
    super('書き出しをキャンセルしました。')
    this.name = 'ExportCancelled'
  }
}

/** ループが依存するもの。実物は exportProject が組み立て、テストではフェイクを渡す */
export type ExportDeps = {
  ctx: Ctx
  provider: ExportFrameProvider
  encoder: FrameEncoder
}

/**
 * 書き出しのループ。1 フレームごとに「非同期で用意 → 同期で描く（renderFrame）→ エンコードを待つ」を繰り返す。
 * プレビューと同じ renderFrame を使うので、見た目が揃う。
 * 失敗・キャンセルのどちらでもエンコーダを止め、デコーダは必ず解放する。
 */
export async function exportFrames(
  project: Project,
  deps: ExportDeps,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  if (project.items.length === 0) throw new Error('素材がありません。')
  const { fps, totalFrames } = project.preset
  const compiled = compileTimeline(project.items)
  const { ctx, provider, encoder } = deps

  try {
    await encoder.start()
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal.aborted) throw new ExportCancelled()
      await provider.prepare(frame)
      renderFrame(compiled, project.items, frame, ctx, provider)
      await encoder.add(frame / fps, 1 / fps)
      if (frame % 10 === 0) onProgress({ frame, totalFrames })
    }
    // 最後のフレームを待っている間にキャンセルされた場合も、成功として返さない
    if (signal.aborted) throw new ExportCancelled()
    const blob = await encoder.finalize()
    onProgress({ frame: totalFrames, totalFrames })
    return blob
  } catch (error) {
    await encoder.cancel()
    if (error instanceof ExportCancelled) throw error
    // どの設定で失敗したかを含めて投げ直す（実機での原因切り分け用）
    throw new Error(`${formatError(error)}（${encoder.usedCodecString()}）`, { cause: error })
  } finally {
    await provider.dispose()
  }
}

/**
 * プロジェクトを無音 MP4 に書き出す（実物の組み立て）。
 * 1. 使える H.264 の設定を選ぶ（2 回目以降は覚えた値）
 * 2. 出力サイズの Canvas、画像の供給役、エンコーダを用意して exportFrames を回す
 * videos は M3(B) で動画素材のデコーダを渡す。写真だけなら空。
 */
export async function exportProject(
  project: Project,
  photos: Record<string, ProvidedImage>,
  videos: Map<string, FrameSource>,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<ExportResult> {
  const startedAt = performance.now()
  const { width, height, fps } = project.preset
  const choice = await pickEncoder(width, height, fps, EXPORT_BITRATE, signal)
  if (signal.aborted) throw new ExportCancelled()
  if (!choice)
    throw new Error('この端末では MP4（H.264）を書き出せません。別の端末をお使いください。')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas を作れませんでした。')

  const compiled = compileTimeline(project.items)
  const encoder = createMp4Encoder(canvas, fps, choice)
  const provider = createFrameProvider(compiled, photos, videos)
  const blob = await exportFrames(project, { ctx, provider, encoder }, onProgress, signal)
  return { blob, codecString: encoder.usedCodecString(), elapsedMs: performance.now() - startedAt }
}
