import { BufferTarget, CanvasSource, Mp4OutputFormat, Output } from 'mediabunny'
import type { GroupPreset } from '../model/types'
import type { ImportedVideo } from '../media/importVideo'
import { compileSegments, segmentAt, type Segment } from '../timeline/compile'
import { equalSplit } from '../timeline/durations'
import { drawCover } from '../render/renderFrame'
import { describe, pickEncoder } from './codec'
import { PhotoFrameSource, VideoFrameSource, type FrameSource } from './frameSource'

/** M0 の入力: 写真 1 枚と動画 1 本（どちらか片方でもよい） */
export type ExportInput = {
  preset: GroupPreset
  photo: ImageBitmap | null
  video: ImportedVideo | null
}

export type ExportProgress = {
  frame: number
  totalFrames: number
}

export type ExportResult = {
  blob: Blob
  fullCodecString: string
  latencyMode: string
  elapsedMs: number
}

export class ExportCancelled extends Error {
  constructor() {
    super('書き出しをキャンセルしました。')
    this.name = 'ExportCancelled'
  }
}

/** 1080p の目安ビットレート（8 Mbps） */
const BITRATE = 8_000_000

/**
 * 写真と動画を cut でつないで、プリセットどおりの無音 MP4 を書き出す。
 * main thread で動く。1 フレームごとに「非同期で用意 → 同期で描く → エンコードを待つ」を繰り返す。
 */
export async function exportVideo(
  input: ExportInput,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<ExportResult> {
  const { preset } = input
  const startedAt = performance.now()

  // 1. この端末で使える H.264 の設定を、実際に数フレームをエンコードして選ぶ
  const choice = await pickEncoder(preset.width, preset.height, preset.fps, BITRATE)
  if (!choice) {
    throw new Error('この端末では MP4（H.264）を書き出せません。別の端末をお使いください。')
  }

  // 2. タイムライン: 素材を均等割りで並べる（M0 はトランジション無し）
  const itemIds: string[] = []
  if (input.photo) itemIds.push('photo')
  if (input.video) itemIds.push('video')
  if (itemIds.length === 0) throw new Error('素材がありません。')
  const durations = equalSplit(itemIds.length, preset.totalFrames)
  const segments = compileSegments(
    itemIds.map((itemId, i) => ({ itemId, durationFrames: durations[i] })),
  )

  // 3. 各素材のフレーム供給役を作る
  const sources = new Map<string, FrameSource>()
  const canvas = document.createElement('canvas')
  canvas.width = preset.width
  canvas.height = preset.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas を作れませんでした。')

  let usedCodecString = choice.fullCodecString ?? '(auto)'
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
  const canvasSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: BITRATE,
    keyFrameInterval: 1,
    latencyMode: choice.latencyMode,
    fullCodecString: choice.fullCodecString,
    // 実際に使われたエンコーダ設定を控えておく（失敗時の表示用）
    onEncoderConfig: (config) => {
      usedCodecString = config.codec
    },
  })
  output.addVideoTrack(canvasSource, { frameRate: preset.fps })

  try {
    if (input.photo) sources.set('photo', new PhotoFrameSource(input.photo))
    if (input.video) {
      const segment = findSegment(segments, 'video')
      sources.set(
        'video',
        new VideoFrameSource(input.video, segment, preset.fps, 0, preset.width, preset.height),
      )
    }

    await output.start()

    // 4. フレームループ
    for (let frame = 0; frame < preset.totalFrames; frame++) {
      if (signal.aborted) throw new ExportCancelled()

      const segment = segmentAt(segments, frame)
      if (!segment) throw new Error(`フレーム ${frame} に対応する素材がありません。`)
      const source = sources.get(segment.itemId)
      if (!source) throw new Error(`素材 ${segment.itemId} が見つかりません。`)

      await source.prepare(frame)
      drawCover(ctx, source.get(), source.width(), source.height())
      await canvasSource.add(frame / preset.fps, 1 / preset.fps)

      if (frame % 10 === 0) onProgress({ frame, totalFrames: preset.totalFrames })
    }

    // 最後のフレームを待っている間にキャンセルされた場合も、成功として返さない
    if (signal.aborted) throw new ExportCancelled()
    await output.finalize()
    const buffer = output.target.buffer
    if (!buffer) throw new Error('書き出し結果が空でした。')
    onProgress({ frame: preset.totalFrames, totalFrames: preset.totalFrames })

    return {
      blob: new Blob([buffer as BlobPart], { type: 'video/mp4' }),
      fullCodecString: usedCodecString,
      latencyMode: choice.latencyMode,
      elapsedMs: performance.now() - startedAt,
    }
  } catch (error) {
    // 失敗・キャンセルのどちらでも Output は閉じる（finalize 済みなら何もしない）
    await output.cancel().catch(() => {})
    if (error instanceof ExportCancelled) throw error
    // どの設定で失敗したかを含めて投げ直す（iPhone での原因切り分け用）
    throw new Error(`${describe(error)}（${usedCodecString} / ${choice.latencyMode}）`)
  } finally {
    // 失敗でも成功でも、デコーダは必ず解放し、解放が終わるまで待つ
    for (const source of sources.values()) await source.dispose()
  }
}

function findSegment(segments: Segment[], itemId: string): Segment {
  const segment = segments.find((s) => s.itemId === itemId)
  if (!segment) throw new Error(`素材 ${itemId} の区間がありません。`)
  return segment
}
