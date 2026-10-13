import type {
  Caption,
  GroupPreset,
  KenBurns,
  MediaItem,
  PhotoItem,
  Project,
  Transition,
} from '../model/types'
import { kenBurnsPreset } from '../render/kenBurns'
import { clampAfterResize } from '../timeline/clamp'
import { adjustDurations, equalSplit, maxItems } from '../timeline/durations'

// プロジェクトを変える操作。すべて純粋関数で、新しい Project を返す（元は変えない）。
// 変えられないときは元の Project をそのまま返す（呼び出し側は同一性で判定できる）。
// 不変条件「尺の合計 = totalFrames」は、素材の増減のたびに均等割りをやり直すことで守る。

/** 写真を追加するときに必要な情報（取り込み結果） */
export type PhotoInfo = {
  blobKey: string
  thumbKey: string
  fileName: string
  width: number
  height: number
}

export function createProject(
  preset: GroupPreset,
  meta: { memberName: string; spot: string },
): Project {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    preset: { ...preset },
    locked: false,
    meta: { ...meta },
    items: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** 写真を末尾に追加する。尺は全素材で均等に割り直す（手動調整はリセットされる） */
export function addPhoto(project: Project, itemId: string, info: PhotoInfo): Project {
  if (project.items.length >= maxItems(project.preset.totalFrames)) return project
  const photo: PhotoItem = {
    itemId,
    kind: 'photo',
    ...info,
    durationFrames: 0,
    kenBurns: kenBurnsPreset('none'),
    transitionOut: { type: 'cut', durationFrames: 0 },
  }
  return withItems(project, resplit([...project.items, photo], project.preset.totalFrames))
}

/** 素材を外す。残りで均等に割り直す */
export function removeItem(project: Project, itemId: string): Project {
  if (!project.items.some((i) => i.itemId === itemId)) return project
  const rest = project.items.filter((i) => i.itemId !== itemId)
  return withItems(project, resplit(rest, project.preset.totalFrames))
}

/** 素材を toIndex の位置へ動かす。尺は素材についていく */
export function moveItem(project: Project, itemId: string, toIndex: number): Project {
  const from = indexOf(project, itemId)
  if (from < 0 || toIndex < 0 || toIndex >= project.items.length) return project
  const items = [...project.items]
  const [moved] = items.splice(from, 1)
  items.splice(toIndex, 0, moved)
  return withItems(project, clampAfterResize(items))
}

/** 1 つの尺を変え、差分を他へ比例配分する。変えられないときは元のまま */
export function setItemDuration(project: Project, itemId: string, frames: number): Project {
  const index = indexOf(project, itemId)
  if (index < 0) return project
  const before = project.items.map((i) => i.durationFrames)
  const after = adjustDurations(before, index, frames)
  if (after === before) return project
  const items = project.items.map((item, i) => ({ ...item, durationFrames: after[i] }))
  return withItems(project, clampAfterResize(items))
}

export function setKenBurns(
  project: Project,
  itemId: string,
  presetId: KenBurns['presetId'],
): Project {
  return updateItem(project, itemId, (item) =>
    item.kind === 'photo' ? { ...item, kenBurns: kenBurnsPreset(presetId) } : item,
  )
}

/** キャプションを設定する。undefined で外す。オフセットは尺に収まるよう切り詰める */
export function setCaption(
  project: Project,
  itemId: string,
  caption: Caption | undefined,
): Project {
  return updateItem(project, itemId, (item) => {
    const next = { ...item }
    if (caption) next.caption = caption
    else delete next.caption
    return next
  })
}

/** 次の素材へのつなぎを設定する。長さは上限に切り詰める */
export function setTransition(project: Project, itemId: string, transition: Transition): Project {
  return updateItem(project, itemId, (item) => ({ ...item, transitionOut: { ...transition } }))
}

// --- 内部の小さな助け ---

function indexOf(project: Project, itemId: string): number {
  return project.items.findIndex((i) => i.itemId === itemId)
}

/** 尺を均等に割り直し、トランジションとキャプションを整える */
function resplit(items: MediaItem[], totalFrames: number): MediaItem[] {
  const durations = equalSplit(items.length, totalFrames)
  return clampAfterResize(items.map((item, i) => ({ ...item, durationFrames: durations[i] })))
}

function updateItem(
  project: Project,
  itemId: string,
  change: (item: MediaItem) => MediaItem,
): Project {
  const index = indexOf(project, itemId)
  if (index < 0) return project
  const items = project.items.map((item, i) => (i === index ? change(item) : item))
  return withItems(project, clampAfterResize(items))
}

function withItems(project: Project, items: MediaItem[]): Project {
  return { ...project, items, updatedAt: new Date().toISOString() }
}
