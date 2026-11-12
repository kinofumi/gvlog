import { BGM_SAMPLE_RATE, canEncodeBgm, createBgmProvider } from '../bgm/bgmAudio'
import { totalSamplesFor } from '../bgm/loop'
import type { ImportedVideo } from '../media/importVideo'
import type { Project } from '../model/types'
import type { ProvidedImage } from '../render/renderFrame'
import { compileTimeline } from '../timeline/compile'
import { outputFrames } from '../timeline/durations'
import { pickEncoder, EXPORT_BITRATE } from './codec'
import { createMp4Encoder } from './encoder'
import { ExportCancelled, exportFrames, type ExportProgress } from './exportVideo'
import { createFrameProvider } from './frameProvider'
import { VideoFrameSource, type FrameSource } from './frameSource'
import { createVideoSources } from './videoSources'

export type ExportResult = {
  blob: Blob
  codecString: string
  elapsedMs: number
}

export type ExportOptions = {
  /** 付ける BGM（デコード済みのモノラル PCM、bgmAudio.loadBgm の結果）。無ければ無音の MP4 */
  bgm?: Float32Array | null
}

/**
 * プロジェクトを MP4 に書き出す（実物の組み立て）。BGM が無ければ無音。
 * 1. BGM を付けるなら、この端末で AAC を作れるか先に確かめる（安い確認なので最初に）
 * 2. 動画のデコーダを用意する（データの欠けはここで分かる。遅いエンコーダ診断の前に止める）
 * 3. 使える H.264 の設定を選ぶ（2 回目以降は覚えた値）。この間は進捗が出ない
 * 4. 出力サイズの Canvas、画像の供給役、エンコーダ（BGM があれば音声トラック付き）を用意して exportFrames を回す
 * videos は取り込んだ動画（store が持つもの）。作ったデコーダは、exportFrames に渡す前に失敗したときもここで解放する。
 */
export async function exportProject(
  project: Project,
  photos: Record<string, ProvidedImage>,
  videos: Record<string, ImportedVideo>,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
  options: ExportOptions = {},
): Promise<ExportResult> {
  const startedAt = performance.now()
  const { width, height, fps, maxFrames } = project.preset
  let sources = new Map<string, FrameSource>()
  let handedOver = false
  try {
    if (project.items.length === 0) throw new Error('素材がありません。')
    const song = options.bgm ?? null
    if (song && !(await canEncodeBgm()))
      throw new Error(
        'この端末では BGM 付きの MP4 を作れません（iPhone は iOS 26 以降）。BGM を「なし」にしてください。',
      )
    const compiled = compileTimeline(project.items)
    // 出力の長さ。デコーダの範囲、映像のフレーム数、BGM の長さがすべてこの値に揃う
    const totalFrames = outputFrames(
      project.items.map((i) => i.durationFrames),
      maxFrames,
    )
    sources = await createVideoSources(
      compiled,
      project.items,
      videos,
      totalFrames,
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

    const encoder = createMp4Encoder(canvas, fps, choice, song !== null)
    const provider = createFrameProvider(compiled, photos, sources)
    const bgm = song
      ? createBgmProvider(song, totalSamplesFor(totalFrames, fps, BGM_SAMPLE_RATE))
      : undefined
    handedOver = true
    const blob = await exportFrames(
      project,
      { compiled, ctx, provider, encoder, bgm },
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
