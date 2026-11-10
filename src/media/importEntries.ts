import type { GroupPreset } from '../model/types'
import { newId } from '../model/ids'
import type { NewEntry } from '../state/store'
import { importImage } from './importImage'
import { importVideo } from './importVideo'
import { makeVideoPoster } from './videoPoster'

/** ポスター（動画の先頭フレーム）の大きさ。出力の半分で、サムネイルとプレビューの代用に足りる */
const POSTER_SCALE = 0.5

/** 写真 1 枚を取り込んで、store に渡す形にする（編集タブとつなげるタブで共用） */
export async function importOnePhoto(file: File, preset: GroupPreset): Promise<NewEntry> {
  const imported = await importImage(file, preset.width, preset.height)
  const itemId = newId()
  return {
    itemId,
    // blobKey / thumbKey は M4（IndexedDB 保存）で本物の鍵になる。今は素材 ID で埋める
    info: {
      kind: 'photo',
      blobKey: itemId,
      thumbKey: itemId,
      fileName: file.name,
      width: imported.width,
      height: imported.height,
    },
    image: { image: imported.bitmap, width: imported.width, height: imported.height },
  }
}

/** 動画を開いてポスターを作る。ポスターに失敗したら動画も解放する（store にはまだ渡していない） */
export async function importOneVideo(
  file: File,
  preset: GroupPreset,
  notes: string[],
): Promise<NewEntry> {
  const video = await importVideo(file)
  const width = Math.round(preset.width * POSTER_SCALE)
  const height = Math.round(preset.height * POSTER_SCALE)
  let poster: ImageBitmap
  try {
    poster = await makeVideoPoster(video, width, height)
  } catch (error) {
    video.input.dispose()
    throw error
  }
  if (video.isHdr) {
    // 色が変わる可能性がある（plan §9）。実機で確認するまでは止めず、案内だけ出す
    notes.push(`${file.name} は HDR 動画です。書き出した色が元と違って見えることがあります。`)
  }
  const itemId = newId()
  return {
    itemId,
    info: {
      kind: 'video',
      blobKey: itemId,
      thumbKey: itemId,
      fileName: file.name,
      width: video.width,
      height: video.height,
      // durationSec は末尾の時刻なので、先頭の時刻（0 でないことがある）を引いて実際の長さにする
      sourceDurationFrames: Math.floor((video.durationSec - video.firstTimestampSec) * preset.fps),
    },
    image: { image: poster, width, height },
    video,
  }
}
