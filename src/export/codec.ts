import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, canEncodeVideo } from 'mediabunny'
import { formatError } from './formatError'
import { withTimeout } from './withTimeout'

/** 1080p の目安ビットレート（8 Mbps）。書き出しと診断で同じ値を使う */
export const EXPORT_BITRATE = 8_000_000

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

export type LatencyMode = 'quality' | 'realtime'

/**
 * 書き出しは 'quality' だけを使う。WebCodecs の仕様で 'quality' はフレームを落としてはいけないので、
 * 固定尺（300 フレーム）が保証される。'realtime' はフレームを落としてよいので書き出しには使わない。
 * Safari の H.264 エンコーダが 'quality' で止まる既知の不具合（mediabunny issue #541）は、
 * iPhone（iOS 18.7）/ Android / PC の実機では再現しなかった。診断では両方を試して表にする。
 */
const EXPORT_LATENCY_MODE: LatencyMode = 'quality'
const DIAGNOSTIC_LATENCY_MODES: LatencyMode[] = ['quality', 'realtime']

/** 1 候補あたりの試行フレーム数と、固まったとみなすまでの時間 */
const PROBE_FRAMES = 5
const PROBE_TIMEOUT_MS = 4000

export type EncoderChoice = {
  fullCodecString: string | undefined
  latencyMode: LatencyMode
}

export type ProbeResult = EncoderChoice & {
  /** canEncodeVideo（isConfigSupported）の結果。判定だけで、対応の根拠にはしない */
  claimed: boolean
  /** 実際に数フレームをエンコードして MP4 を作れたか */
  encodeOk: boolean
  /** 期限内に終わらなかった（エンコーダが固まった可能性） */
  timedOut: boolean
  error: string
  ms: number
}

/**
 * 1 つの設定で、実際に数フレームをエンコードしてみる。
 * 能力判定が通っても実エンコードで失敗する端末があるため、ここで確かめる。
 * 失敗はすべて ProbeResult に閉じ込める（この関数は投げない）。
 * エンコーダが固まる不具合に備えて、能力判定を含む試行全体にタイムアウトを付ける。
 *
 * 既知の制限: mediabunny（1.61.3 / 1.61.4 で確認）の Output.cancel() は finalize() の途中では何もしない。
 * finalize() の中でエンコーダが固まった場合、タイムアウト後もそのエンコーダは解放できず残る。
 * 実機では固まる現象は起きていないので、v1 ではこのままにする。
 */
export async function probeOne(
  choice: EncoderChoice,
  width: number,
  height: number,
  fps: number,
  bitrate: number,
  signal?: AbortSignal,
): Promise<ProbeResult> {
  const startedAt = performance.now()
  const result: ProbeResult = {
    ...choice,
    claimed: false,
    encodeOk: false,
    timedOut: false,
    error: '',
    ms: 0,
  }

  // 失敗したときに閉じるため、Output は work の外で作る（Output の作成は投げない）
  const target = new BufferTarget()
  const output = new Output({ format: new Mp4OutputFormat(), target })

  const work = async () => {
    // 能力判定。投げる実装もあるので、失敗は「不可」として実エンコードに進む
    try {
      result.claimed = await canEncodeVideo('avc', {
        width,
        height,
        frameRate: fps,
        bitrate,
        fullCodecString: choice.fullCodecString,
        latencyMode: choice.latencyMode,
      })
    } catch {
      result.claimed = false
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas を作れませんでした。')

    // コーデック文字列が不正なら CanvasSource の作成で投げる。それも「この候補の失敗」として扱う
    const source = new CanvasSource(canvas, {
      codec: 'avc',
      bitrate,
      keyFrameInterval: 1,
      latencyMode: choice.latencyMode,
      fullCodecString: choice.fullCodecString,
    })
    output.addVideoTrack(source, { frameRate: fps })

    await output.start()
    for (let i = 0; i < PROBE_FRAMES; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#246' : '#642'
      ctx.fillRect(0, 0, width, height)
      await source.add(i / fps, 1 / fps)
    }
    await output.finalize()
    if (!target.buffer || target.buffer.byteLength === 0) throw new Error('出力が空でした。')
  }

  try {
    await withTimeout(work(), PROBE_TIMEOUT_MS, signal)
    result.encodeOk = true
  } catch (error) {
    result.error = formatError(error)
    result.timedOut = result.error.includes('固まった可能性')
    // start 済みなら強制終了する。finalize 中は何もしない（上の既知の制限）
    await output.cancel().catch(() => {})
  }
  result.ms = Math.round(performance.now() - startedAt)
  return result
}

/** すべての組み合わせを試して結果を返す（診断画面用）。書き出しでは使わない 'realtime' も含める */
export async function probeAll(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<ProbeResult[]> {
  const results: ProbeResult[] = []
  for (const latencyMode of DIAGNOSTIC_LATENCY_MODES) {
    for (const fullCodecString of CODEC_CANDIDATES) {
      results.push(await probeOne({ fullCodecString, latencyMode }, width, height, fps, bitrate))
    }
  }
  return results
}

/** 一度決めた設定はページを開いている間は変わらないので、覚えておいて 2 回目以降の書き出しで使う */
let cachedChoice: { key: string; choice: EncoderChoice } | null = null

/**
 * この端末で実際に使える H.264 の設定を返す。最初に実エンコードが成功したもの。
 * どれも使えなければ null。signal で中断されたら、それ以上の候補は試さずに null を返す
 * （呼び出し側は signal.aborted を見てキャンセルと区別する）。
 * 1 つの候補が固まったら（タイムアウト）、残りの候補も同じエンコーダで固まる可能性が高く、
 * 固まったエンコーダは解放できないので、それ以上は試さない。
 */
export async function pickEncoder(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
  signal?: AbortSignal,
): Promise<EncoderChoice | null> {
  const key = `${width}x${height}@${fps}/${bitrate}`
  if (cachedChoice && cachedChoice.key === key) return cachedChoice.choice

  for (const fullCodecString of CODEC_CANDIDATES) {
    if (signal?.aborted) return null
    const choice: EncoderChoice = { fullCodecString, latencyMode: EXPORT_LATENCY_MODE }
    const probe = await probeOne(choice, width, height, fps, bitrate, signal)
    if (probe.encodeOk) {
      cachedChoice = { key, choice }
      return choice
    }
    if (probe.timedOut) return null
  }
  return null
}
