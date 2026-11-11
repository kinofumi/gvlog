import { DEFAULT_PRESET } from '../model/defaults'
import type { GroupPreset, Project, VideoInfo } from '../model/types'
import { addItems, createProject, setItemDuration, setTransition } from '../state/projectActions'

/** つなぎの白フェードの長さ（約 0.5 秒）。偶数なので境界のフレームが真っ白になる。長いと「白い間」が目立つ（ADR 016） */
export const JOIN_FADE_FRAMES = 16

/** つなげた全体の上限（10 分）。編集の 15 秒とは別で、人数分の動画が入る長さにしてある */
export const JOIN_MAX_FRAMES = 30 * 60 * 10

/** つなげる用のプリセット。画面サイズと fps は編集と同じ（全員の動画がこの形で出ている） */
export const JOIN_PRESET: GroupPreset = { ...DEFAULT_PRESET, maxFrames: JOIN_MAX_FRAMES }

export type JoinClip = {
  itemId: string
  info: VideoInfo
}

/**
 * 全員の動画を順に並べたプロジェクトを作る（ADR 017）。
 * 各クリップの尺は元の動画の長さ（1 秒未満なら 1 秒にして最後のフレームで止める。編集で作る動画は 1 秒以上なので実際には起きない）、
 * クリップの間は白フェード。できたプロジェクトは編集と同じ exportProject で書き出せる。
 * createProject が ID と日時を作るので厳密には純粋ではないが、素材と尺とつなぎは入力だけで決まる。
 */
export function buildJoinProject(clips: JoinClip[]): Project {
  let project = addItems(createProject(JOIN_PRESET, { memberName: '', spot: '' }), clips)
  clips.forEach((clip, i) => {
    project = setItemDuration(project, clip.itemId, clip.info.sourceDurationFrames)
    if (i < clips.length - 1) {
      project = setTransition(project, clip.itemId, {
        type: 'fadeWhite',
        durationFrames: JOIN_FADE_FRAMES,
      })
    }
  })
  return project
}
