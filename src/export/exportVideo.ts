import type { BgmProvider } from '../bgm/bgmAudio'
import type { Project } from '../model/types'
import type { Ctx } from '../render/ctx'
import { renderFrame } from '../render/renderFrame'
import type { CompiledItem } from '../timeline/compile'
import { outputFrames } from '../timeline/durations'
import type { FrameEncoder } from './encoder'
import { formatError } from './formatError'
import type { ExportFrameProvider } from './frameProvider'

/** 進み具合。stage が 'bgm' のときは映像が終わって BGM を付けている（frame は totalFrames） */
export type ExportProgress = {
  frame: number
  totalFrames: number
  stage: 'video' | 'bgm'
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
  /** BGM（無ければ無音）。映像を全部エンコードしたあとに 1 秒ずつ足す */
  bgm?: BgmProvider
}

/** BGM を 1 回に足す長さ（サンプル数）。1 秒ずつにして、メモリに全体を持たない */
const BGM_CHUNK_SEC = 1

/**
 * 書き出しのループ。1 フレームごとに「非同期で用意 → 同期で描く（renderFrame）→ エンコードを待つ」を繰り返す。
 * プレビューと同じ renderFrame を使うので、見た目が揃う。
 * 失敗・キャンセルのどちらでもエンコーダを止め、デコーダは必ず解放する。
 * 失敗時は、どの設定で失敗したかを文に含める（実機での原因切り分け用）。後始末の失敗は元の失敗に併記する。
 * 成功したあとで解放に失敗したときは、できた MP4 を捨てず、警告だけ出して返す。
 * BGM があれば、映像のあとに出力と同じ長さだけ 1 秒ずつ足す（ループとフェードアウトは BgmProvider の中）。
 */
export async function exportFrames(
  project: Project,
  deps: ExportDeps,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const { fps, maxFrames } = project.preset
  // 出力の長さ。合計が上限を超えた分は先頭から maxFrames で切る（ADR 015）
  const totalFrames = outputFrames(
    project.items.map((i) => i.durationFrames),
    maxFrames,
  )
  const { compiled, ctx, provider, encoder, bgm } = deps
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
      if (frame % 10 === 0) onProgress({ frame, totalFrames, stage: 'video' })
    }
    if (bgm) {
      // 映像のあとに BGM を 1 秒ずつ。長さは BgmProvider が持つ（フェードアウトの位置と同じ値）
      onProgress({ frame: totalFrames, totalFrames, stage: 'bgm' })
      const step = bgm.sampleRate * BGM_CHUNK_SEC
      for (let start = 0; start < bgm.totalSamples; start += step) {
        if (signal.aborted) throw new ExportCancelled()
        await encoder.addAudio(bgm.chunk(start, Math.min(step, bgm.totalSamples - start)))
      }
    }
    // 最後のフレームや finalize を待っている間にキャンセルされた場合も、成功として返さない
    if (signal.aborted) throw new ExportCancelled()
    result = await encoder.finalize()
    if (signal.aborted) throw new ExportCancelled()
    onProgress({ frame: totalFrames, totalFrames, stage: 'video' })
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
