import { BlobSource, Input, MP4, QTFF, type InputVideoTrack } from 'mediabunny'
import { VIDEO_MAX_BYTES, VIDEO_MAX_HEIGHT, VIDEO_MAX_WIDTH } from './limits'
import { MediaError } from './errors'

/** 動画を読み込んで分かったこと。UI の表示と書き出しの両方で使う */
export type ImportedVideo = {
  file: File
  input: Input
  track: InputVideoTrack
  codec: string
  durationSec: number
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
    throw new MediaError('動画が大きすぎます（500MB まで）。短く切ってから選んでください。')
  }

  // 読むのは MP4 と MOV（QTFF）だけ。ALL_FORMATS にすると未使用のパーサーまでバンドルされて重くなる
  const input = new Input({ formats: [MP4, QTFF], source: new BlobSource(file) })
  let track: InputVideoTrack | null
  try {
    track = await input.getPrimaryVideoTrack()
  } catch {
    throw new MediaError('この動画は読み込めませんでした。MP4 または MOV を選んでください。')
  }
  if (!track) {
    throw new MediaError('この動画には映像トラックがありません。')
  }

  const [codec, durationSec, width, height, rotation, colorSpace, canDecode] = await Promise.all([
    track.getCodec(),
    track.computeDuration(),
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

  // TypeScript の DOM 型には 'hlg' / 'pq' が無いが、実際のブラウザはこの値を返すので文字列として扱う
  const transfer: string | null = colorSpace.transfer ?? null
  return {
    file,
    input,
    track,
    codec: codec ?? 'unknown',
    durationSec,
    width,
    height,
    rotation,
    transfer,
    isHdr: transfer === 'hlg' || transfer === 'pq',
    canDecode,
  }
}
