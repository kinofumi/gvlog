import { BufferSource, Input, MP4, QTFF, type InputVideoTrack } from 'mediabunny'
import { VIDEO_MAX_BYTES, VIDEO_MAX_HEIGHT, VIDEO_MAX_WIDTH } from './limits'
import { MediaError } from './errors'

/** 動画を読み込んで分かったこと。UI の表示と書き出しの両方で使う */
export type ImportedVideo = {
  fileName: string
  input: Input
  track: InputVideoTrack
  codec: string
  durationSec: number
  /** 先頭フレームの時刻（秒）。MOV などでは 0 でないことがある */
  firstTimestampSec: number
  /** 回転適用後の表示サイズ */
  width: number
  height: number
  rotation: number
  /** 色の転送特性。'hlg' や 'pq' なら HDR */
  transfer: string | null
  isHdr: boolean
  canDecode: boolean
}

/**
 * 動画ファイルを開き、メタデータとデコード可否を調べる。
 * デコードはまだしない（書き出し時に必要な区間だけ順にデコードする）。
 */
export async function importVideo(file: File): Promise<ImportedVideo> {
  if (file.size > VIDEO_MAX_BYTES) {
    throw new MediaError('動画が大きすぎます（200MB まで）。短く切ってから選んでください。')
  }

  // ファイルは取り込み時にまるごとメモリへ読む（ADR 012）。
  // Android では選択した File がアプリ切り替えや時間経過で読めなくなり、書き出しの途中で
  // 「TypeError: network error」になることがあった。ここで読んでおけば、読めない素材はこの場で分かる。
  const buffer = await readWholeFile(file)

  // 読むのは MP4 と MOV（QTFF）だけ。ALL_FORMATS にすると未使用のパーサーまでバンドルされて重くなる
  const input = new Input({ formats: [MP4, QTFF], source: new BufferSource(buffer) })
  try {
    return await probe(file, input)
  } catch (error) {
    // 途中で失敗したら Input を解放してから投げ直す（連続で失敗したときに溜め込まない）
    input.dispose()
    throw error
  }
}

async function probe(file: File, input: Input): Promise<ImportedVideo> {
  let track: InputVideoTrack | null
  try {
    track = await input.getPrimaryVideoTrack()
  } catch {
    throw new MediaError('この動画は読み込めませんでした。MP4 または MOV を選んでください。')
  }
  if (!track) {
    throw new MediaError('この動画には映像トラックがありません。')
  }

  const [codec, durationSec, firstTimestampSec, width, height, rotation, colorSpace, canDecode] =
    await Promise.all([
      track.getCodec(),
      track.computeDuration(),
      track.getFirstTimestamp(),
      track.getDisplayWidth(),
      track.getDisplayHeight(),
      track.getRotation(),
      track.getColorSpace(),
      track.canDecode(),
    ])

  const longSide = Math.max(width, height)
  const shortSide = Math.min(width, height)
  if (longSide > VIDEO_MAX_WIDTH || shortSide > VIDEO_MAX_HEIGHT) {
    throw new MediaError('動画の解像度が大きすぎます（4K まで）。')
  }
  if (!canDecode) {
    throw new MediaError(
      'この端末ではこの動画を読み込めません。別の動画を選ぶか、PC をお使いください。',
    )
  }

  const transfer: string | null = colorSpace.transfer ?? null
  return {
    fileName: file.name,
    input,
    track,
    codec: codec ?? 'unknown',
    durationSec,
    firstTimestampSec,
    width,
    height,
    rotation,
    transfer,
    isHdr: transfer === 'hlg' || transfer === 'pq',
    canDecode,
  }
}

async function readWholeFile(file: File): Promise<ArrayBuffer> {
  try {
    return await file.arrayBuffer()
  } catch {
    throw new MediaError('動画を読み込めませんでした。もう一度ファイルを選び直してください。')
  }
}
