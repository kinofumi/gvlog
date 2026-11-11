import { DEFAULT_PRESET } from '../model/defaults'
import type { GroupPreset, PhotoInfo, Project, VideoInfo } from '../model/types'
import {
  addItems,
  createProject,
  setCaption,
  setItemDuration,
  setTransition,
} from '../state/projectActions'

/** つなぎの白フェードの長さ（約 0.5 秒）。偶数なので境界のフレームが真っ白になる。長いと「白い間」が目立つ（ADR 016） */
export const JOIN_FADE_FRAMES = 16

/** つなげた全体の上限（10 分）。編集の 15 秒とは別で、人数分の動画が入る長さにしてある */
export const JOIN_MAX_FRAMES = 30 * 60 * 10

/** つなげる用のプリセット。画面サイズと fps は編集と同じ（全員の動画がこの形で出ている） */
export const JOIN_PRESET: GroupPreset = { ...DEFAULT_PRESET, maxFrames: JOIN_MAX_FRAMES }

/** 表紙（先頭に置く 1 枚。文字はテロップで描く）の素材 ID と尺（3 秒） */
export const JOIN_COVER_ID = 'join-cover'
export const JOIN_COVER_FRAMES = 90
/** 終わり（最後に白フェードでつなぐ白い 1 枚）の素材 ID と尺。白フェードが切り詰められない最短（つなぎの 2 倍、約 1 秒） */
export const JOIN_END_ID = 'join-end'
export const JOIN_END_FRAMES = JOIN_FADE_FRAMES * 2

export type JoinClip = {
  itemId: string
  info: VideoInfo
}

/** 表紙と終わりは出力と同じ大きさの 1 枚の絵（JoinPanel が canvas で作る） */
function cardInfo(fileName: string): PhotoInfo {
  return {
    kind: 'photo',
    blobKey: fileName,
    thumbKey: fileName,
    fileName,
    width: JOIN_PRESET.width,
    height: JOIN_PRESET.height,
  }
}

/**
 * 全員の動画を順に並べたプロジェクトを作る（ADR 017）。
 * - 表紙の文字があれば先頭に 3 秒の表紙（文字はテロップ、位置は中央）。空白だけなら表紙は無し。
 * - 各クリップの尺は元の動画の長さ（1 秒未満なら 1 秒にして最後のフレームで止める。編集で作る動画は 1 秒以上なので実際には起きない）。
 * - 間はすべて白フェード。最後は白い 1 秒の「終わり」につなぐので、白フェードアウトして終わる。
 * クリップが無ければ空のまま。できたプロジェクトは編集と同じ exportProject で書き出せる。
 * createProject が ID と日時を作るので厳密には純粋ではないが、素材と尺とつなぎは入力だけで決まる。
 */
export function buildJoinProject(clips: JoinClip[], coverText = ''): Project {
  const empty = createProject(JOIN_PRESET, { memberName: '', spot: '' })
  if (clips.length === 0) return empty
  const hasCover = coverText.trim() !== ''
  const entries = [
    ...(hasCover ? [{ itemId: JOIN_COVER_ID, info: cardInfo('表紙') }] : []),
    ...clips,
    { itemId: JOIN_END_ID, info: cardInfo('終わり') },
  ]
  let project = addItems(empty, entries)
  if (hasCover) {
    project = setItemDuration(project, JOIN_COVER_ID, JOIN_COVER_FRAMES)
    project = setCaption(project, JOIN_COVER_ID, {
      text: coverText,
      presetId: 'outline',
      position: 'middle',
      size: 'L',
      inOffsetFrames: 0,
      outOffsetFrames: 0,
    })
  }
  for (const clip of clips) {
    project = setItemDuration(project, clip.itemId, clip.info.sourceDurationFrames)
  }
  project = setItemDuration(project, JOIN_END_ID, JOIN_END_FRAMES)
  // 最後（終わり）以外はすべて白フェードでつなぐ
  for (const item of project.items.slice(0, -1)) {
    project = setTransition(project, item.itemId, {
      type: 'fadeWhite',
      durationFrames: JOIN_FADE_FRAMES,
    })
  }
  return project
}
