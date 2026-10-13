import type { ImportedVideo } from '../media/importVideo'
import type { Project } from '../model/types'
import type { Ctx } from '../render/ctx'
import { renderFrame, type ProvidedImage } from '../render/renderFrame'
import { compileTimeline, type CompiledItem } from '../timeline/compile'
import { pickEncoder, EXPORT_BITRATE } from './codec'
import { createMp4Encoder, type FrameEncoder } from './encoder'
import { formatError } from './formatError'
import { createFrameProvider, type ExportFrameProvider } from './frameProvider'
import { VideoFrameSource, type FrameSource } from './frameSource'
import { createVideoSources } from './videoSources'

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
  /** タイムライン。provider と renderFrame が同じものを見る */
  compiled: CompiledItem[]
  ctx: Ctx
  provider: ExportFrameProvider
  encoder: FrameEncoder
}

/**
 * 書き出しのループ。1 フレームごとに「非同期で用意 → 同期で描く（renderFrame）→ エンコードを待つ」を繰り返す。
 * プレビューと同じ renderFrame を使うので、見た目が揃う。
 * 失敗・キャンセルのどちらでもエンコーダを止め、デコーダは必ず解放する。
 * 失敗時は、どの設定で失敗したかを文に含める（実機での原因切り分け用）。後始末の失敗は元の失敗に併記する。
 * 成功したあとで解放に失敗したときは、できた MP4 を捨てず、警告だけ出して返す。
 */
export async function exportFrames(
  project: Project,
  deps: ExportDeps,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const { fps, totalFrames } = project.preset
  const { compiled, ctx, provider, encoder } = deps
  let result: Blob | null = null
  let failure: unknown = null

  try {
    if (project.items.length === 0) throw new Error('素材がありません。')
    await encoder.start()
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal.aborted) throw new ExportCancelled()
      await provider.prepare(frame)
      renderFrame(compiled, project.items, frame, ctx, provider)
      await encoder.add(frame / fps, 1 / fps)
      if (frame % 10 === 0) onProgress({ frame, totalFrames })
    }
    // 最後のフレームや finalize を待っている間にキャンセルされた場合も、成功として返さない
    if (signal.aborted) throw new ExportCancelled()
    result = await encoder.finalize()
    if (signal.aborted) throw new ExportCancelled()
    onProgress({ frame: totalFrames, totalFrames })
  } catch (error) {
    failure =
      error instanceof ExportCancelled
        ? error
        : new Error(`${formatError(error)}（${encoder.usedCodecString()}）`, { cause: error })
    // 失敗・キャンセルのどちらでもエンコーダを止める（finalize 済みなら何もしない）
    try {
      await encoder.cancel()
    } catch (cancelError) {
      failure = withCleanupError(failure, cancelError)
    }
  }

  // 成功でも失敗でもデコーダは必ず解放し、解放が終わるまで待つ
  try {
    await provider.dispose()
  } catch (disposeError) {
    if (failure === null) {
      // MP4 はできている。解放の失敗は利用者には直せないので、捨てずに警告だけ出す
      console.warn('書き出しは完了しましたが、デコーダの解放に失敗しました。', disposeError)
    } else {
      failure = withCleanupError(failure, disposeError)
    }
  }

  if (failure !== null) throw failure
  return result as Blob
}

/** 元の失敗を残したまま、後始末の失敗を文に足す。キャンセルはキャンセルのまま（後始末の失敗は警告に出す） */
function withCleanupError(original: unknown, cleanup: unknown): unknown {
  if (original instanceof ExportCancelled) {
    console.warn('キャンセルの後始末に失敗しました。', cleanup)
    return original
  }
  const message = original instanceof Error ? original.message : String(original)
  return new Error(`${message} 後始末にも失敗: ${formatError(cleanup)}`, { cause: original })
}

/**
 * プロジェクトを無音 MP4 に書き出す（実物の組み立て）。
 * 1. 動画のデコーダを用意する（データの欠けはここで分かる。遅いエンコーダ診断の前に止める）
 * 2. 使える H.264 の設定を選ぶ（2 回目以降は覚えた値）。この間は進捗が出ない
 * 3. 出力サイズの Canvas、画像の供給役、エンコーダを用意して exportFrames を回す
 * videos は取り込んだ動画（store が持つもの）。作ったデコーダは、exportFrames に渡す前に失敗したときもここで解放する。
 */
export async function exportProject(
  project: Project,
  photos: Record<string, ProvidedImage>,
  videos: Record<string, ImportedVideo>,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<ExportResult> {
  const startedAt = performance.now()
  const { width, height, fps } = project.preset
  let sources = new Map<string, FrameSource>()
  let handedOver = false
  try {
    if (project.items.length === 0) throw new Error('素材がありません。')
    const compiled = compileTimeline(project.items)
    sources = await createVideoSources(
      compiled,
      project.items,
      videos,
      (video, visibleStart, visibleEnd, trimStartFrames) =>
        new VideoFrameSource(video, visibleStart, visibleEnd, trimStartFrames, fps, width, height),
    )
    const choice = await pickEncoder(width, height, fps, EXPORT_BITRATE, signal)
    if (signal.aborted) throw new ExportCancelled()
    if (!choice)
      throw new Error('この端末では MP4（H.264）を書き出せません。別の端末をお使いください。')

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas を作れませんでした。')

    const encoder = createMp4Encoder(canvas, fps, choice)
    const provider = createFrameProvider(compiled, photos, sources)
    handedOver = true
    const blob = await exportFrames(
      project,
      { compiled, ctx, provider, encoder },
      onProgress,
      signal,
    )
    return {
      blob,
      codecString: encoder.usedCodecString(),
      elapsedMs: performance.now() - startedAt,
    }
  } finally {
    if (!handedOver) await Promise.allSettled([...sources.values()].map((v) => v.dispose()))
  }
}
