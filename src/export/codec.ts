import { canEncodeVideo } from 'mediabunny'

/** v1 で試す H.264 のプロファイル。Constrained Baseline を優先する（iOS で安定） */
const H264_CANDIDATES = [
  'avc1.42E01F', // Constrained Baseline, Level 3.1（1080p30 の上限近く）
  'avc1.42E028', // Constrained Baseline, Level 4.0
  'avc1.4D4028', // Main, Level 4.0
]

export type EncoderChoice = {
  fullCodecString: string
}

/**
 * この端末で使える H.264 のコーデック文字列を返す。
 * 判定には実際の幅・高さ・fps・ビットレートを渡す（「H.264 が使える」だけでは足りない）。
 * どれも使えなければ null。
 */
export async function pickH264(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<EncoderChoice | null> {
  for (const fullCodecString of H264_CANDIDATES) {
    const ok = await canEncodeVideo('avc', { width, height, frameRate: fps, bitrate, fullCodecString })
    if (ok) return { fullCodecString }
  }
  return null
}
