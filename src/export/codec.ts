import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, canEncodeVideo } from 'mediabunny'

/**
 * 試す H.264 のコーデック文字列。順に実際にエンコードして、最初に成功したものを使う。
 * undefined は「mediabunny に幅・高さから自動で決めさせる」。
 * Level 3.1（avc1.42E01F）は候補に入れない。1080x1920 は Level 3.1 の上限を超えるが、
 * iOS Safari は能力判定で「可」と答えたうえで実エンコードに失敗した（2026-10-08、iOS 18.7）。
 */
const CODEC_CANDIDATES: (string | undefined)[] = [
  'avc1.42E028', // Constrained Baseline, Level 4.0
  'avc1.42002A', // Baseline, Level 4.2
  'avc1.4D4028', // Main, Level 4.0
  'avc1.640028', // High, Level 4.0
  undefined,
]

/**
 * latencyMode の候補。'quality' はフレームを落とさないが、Safari の H.264 エンコーダは
 * 'quality' で止まる既知の不具合がある（mediabunny issue #541）。'realtime' は動くが
 * フレームを落とす可能性があるので、出力のフレーム数を検証で確認する。
 */
const LATENCY_CANDIDATES: ('quality' | 'realtime')[] = ['quality', 'realtime']

/** 1 候補あたりの試行フレーム数と、固まったとみなすまでの時間 */
const PROBE_FRAMES = 5
const PROBE_TIMEOUT_MS = 4000

export type EncoderChoice = {
  fullCodecString: string | undefined
  latencyMode: 'quality' | 'realtime'
}

export type ProbeResult = EncoderChoice & {
  /** isConfigSupported の結果（能力判定） */
  claimed: boolean
  /** 実際に数フレームをエンコードして MP4 を作れたか */
  encodeOk: boolean
  error: string
  ms: number
}

/**
 * 1 つの設定で、実際に数フレームをエンコードしてみる。
 * 能力判定（isConfigSupported）が通っても実エンコードで失敗する端末があるため、ここで確かめる。
 * エンコーダが固まる不具合に備えてタイムアウトを付ける。
 */
export async function probeOne(
  choice: EncoderChoice,
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<ProbeResult> {
  const startedAt = performance.now()
  const result: ProbeResult = {
    ...choice,
    claimed: false,
    encodeOk: false,
    error: '',
    ms: 0,
  }

  try {
    result.claimed = await canEncodeVideo('avc', {
      width,
      height,
      frameRate: fps,
      bitrate,
      fullCodecString: choice.fullCodecString,
      latencyMode: choice.latencyMode,
    })
  } catch (error) {
    result.claimed = false
    result.error = `判定: ${describe(error)}`
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    result.error = 'Canvas を作れませんでした。'
    return result
  }

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
  const source = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate,
    keyFrameInterval: 1,
    latencyMode: choice.latencyMode,
    fullCodecString: choice.fullCodecString,
  })
  output.addVideoTrack(source, { frameRate: fps })

  const work = (async () => {
    await output.start()
    for (let i = 0; i < PROBE_FRAMES; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#246' : '#642'
      ctx.fillRect(0, 0, width, height)
      await source.add(i / fps, 1 / fps)
    }
    await output.finalize()
    const buffer = output.target.buffer
    if (!buffer || buffer.byteLength === 0) throw new Error('出力が空でした。')
  })()

  try {
    await withTimeout(work, PROBE_TIMEOUT_MS)
    result.encodeOk = true
  } catch (error) {
    result.error = describe(error)
    await output.cancel().catch(() => {})
  }
  result.ms = Math.round(performance.now() - startedAt)
  return result
}

/** すべての組み合わせを試して結果を返す（診断画面用） */
export async function probeAll(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<ProbeResult[]> {
  const results: ProbeResult[] = []
  for (const latencyMode of LATENCY_CANDIDATES) {
    for (const fullCodecString of CODEC_CANDIDATES) {
      results.push(await probeOne({ fullCodecString, latencyMode }, width, height, fps, bitrate))
    }
  }
  return results
}

/**
 * この端末で実際に使える H.264 の設定を返す。最初に実エンコードが成功したもの。
 * どれも使えなければ null。
 */
export async function pickEncoder(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<EncoderChoice | null> {
  for (const latencyMode of LATENCY_CANDIDATES) {
    for (const fullCodecString of CODEC_CANDIDATES) {
      const probe = await probeOne({ fullCodecString, latencyMode }, width, height, fps, bitrate)
      if (probe.encodeOk) return { fullCodecString, latencyMode }
    }
  }
  return null
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${ms}ms 以内に終わりませんでした（固まった可能性）`)),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** エラーを人が読める 1 行にする（DOMException の name も残す） */
export function describe(error: unknown): string {
  if (error instanceof DOMException) return `${error.name}: ${error.message}`
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}
