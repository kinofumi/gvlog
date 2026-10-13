import type {
  Caption,
  GroupPreset,
  KenBurns,
  MediaInfo,
  MediaItem,
  PhotoInfo,
  Project,
  Transition,
  VideoItem,
} from '../model/types'
import { newId } from '../model/ids'
import { kenBurnsPreset } from '../render/kenBurns'
import { clampAfterResize } from '../timeline/clamp'
import { compileTimeline } from '../timeline/compile'
import { adjustDurations, equalSplit, maxItemFrames, maxItems } from '../timeline/durations'
import { clampTrims, trimEndRange } from '../timeline/trim'

// プロジェクトを変える操作。すべて純粋関数で、新しい Project を返す（元は変えない）。
// 変えられないときは元の Project をそのまま返す（呼び出し側は同一性で判定できる）。
// 不変条件「尺の合計 = totalFrames」は、素材の増減のたびに均等割りをやり直すことで守る。

export function createProject(
  preset: GroupPreset,
  meta: { memberName: string; spot: string },
): Project {
  const now = new Date().toISOString()
  return {
    id: newId(),
    schemaVersion: 1,
    preset: { ...preset },
    locked: false,
    meta: { ...meta },
    items: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function setMeta(project: Project, meta: { memberName: string; spot: string }): Project {
  if (project.meta.memberName === meta.memberName && project.meta.spot === meta.spot) return project
  return { ...project, meta: { ...meta }, updatedAt: new Date().toISOString() }
}

/**
 * 写真を 1 枚末尾に追加する。尺は全素材で均等に割り直す。
 * v1 の割り切り: 追加・削除のたびに手動調整した尺は失われる（plan §2.2）。
 * 「素材を全部入れてから尺を調整する」流れを想定している。
 */
export function addPhoto(project: Project, itemId: string, info: PhotoInfo): Project {
  return addItems(project, [{ itemId, info }])
}

/**
 * 写真と動画を複数まとめて末尾に追加する。均等割りは 1 回だけ行う（1 つずつ足すと毎回割り直す）。
 * 上限を超える分と重複 ID は入れない。1 つも入らなければ元のまま。
 * 動画は開始位置 0 で始める。
 */
export function addItems(
  project: Project,
  entries: { itemId: string; info: MediaInfo }[],
): Project {
  const limit = maxItems(project.preset.totalFrames)
  const items: MediaItem[] = [...project.items]
  for (const { itemId, info } of entries) {
    if (items.length >= limit) break
    if (items.some((i) => i.itemId === itemId)) continue
    const transitionOut: Transition = { type: 'cut', durationFrames: 0 }
    const base = { itemId, durationFrames: 0, transitionOut }
    if (info.kind === 'photo') {
      items.push({ ...base, ...info, kenBurns: kenBurnsPreset('none') })
    } else {
      items.push({ ...base, ...info, trimStartFrames: 0 })
    }
  }
  if (items.length === project.items.length) return project
  return withItems(project, resplit(items, project.preset.totalFrames))
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
  if (from === toIndex) return project
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
  return updateItem(project, itemId, (item) => {
    if (item.kind !== 'photo' || item.kenBurns.presetId === presetId) return item
    return { ...item, kenBurns: kenBurnsPreset(presetId) }
  })
}

/** キャプションを設定する。undefined で外す。オフセットは尺に収まるよう切り詰める */
export function setCaption(
  project: Project,
  itemId: string,
  caption: Caption | undefined,
): Project {
  return updateItem(project, itemId, (item) => {
    if (!caption && !item.caption) return item
    const next = { ...item }
    if (caption) next.caption = caption
    else delete next.caption
    return next
  })
}

/**
 * 次の素材へのつなぎを設定する。長さは 0 以上の整数に整え、次の素材があれば上限に切り詰める。
 * 末尾の素材でも値は保存する（あとで素材を足したときに生きる）。
 */
export function setTransition(project: Project, itemId: string, transition: Transition): Project {
  const durationFrames = Number.isFinite(transition.durationFrames)
    ? Math.max(0, Math.floor(transition.durationFrames))
    : 0
  return updateItem(project, itemId, (item) => {
    const current = item.transitionOut
    if (current && current.type === transition.type && current.durationFrames === durationFrames) {
      return item
    }
    return { ...item, transitionOut: { type: transition.type, durationFrames } }
  })
}

/**
 * 動画の開始位置（元動画のどこから使うか）を設定する。上限への切り詰めは withItems（clampTrims）に任せる。
 * 写真や無い ID、切り詰めた結果が同じ値なら元のまま。
 */
export function setTrimStart(project: Project, itemId: string, trimStartFrames: number): Project {
  const index = indexOf(project, itemId)
  const item = project.items[index]
  if (!item || item.kind !== 'video') return project
  const value = Number.isNaN(trimStartFrames) ? 0 : Math.max(0, Math.floor(trimStartFrames))
  const items = project.items.map((i, k) => (k === index ? { ...i, trimStartFrames: value } : i))
  const next = withItems(project, items)
  const applied = (next.items[index] as VideoItem).trimStartFrames
  return applied === item.trimStartFrames ? project : next
}

/**
 * 動画の終了位置（元動画のどこまで使うか）を設定する。開始位置は変えず、尺を「終了位置 − 開始位置」にする（ADR 014）。
 * 尺の変更は setItemDuration と同じ規則（最小尺、他の素材の最小尺、差分の比例配分）に従う。
 * 素材が 1 つのときは尺が総尺で固定なので変えられない（元のまま）。
 */
export function setTrimEnd(project: Project, itemId: string, trimEndFrames: number): Project {
  const index = indexOf(project, itemId)
  const item = project.items[index]
  if (!item || item.kind !== 'video') return project
  if (!Number.isFinite(trimEndFrames)) return project
  // 元動画の末尾（トランジションで広がる分を除く）より先は使えない。超えた値をそのまま尺にすると、
  // withItems（clampTrims）が開始位置を手前に戻してしまうので、先に上限に止める
  const compiled = compileTimeline(project.items)
  const visibleLength = compiled[index].visibleEnd - compiled[index].visibleStart
  const range = trimEndRange(
    item,
    visibleLength,
    maxItemFrames(project.items.length, project.preset.totalFrames),
  )
  const end = Math.min(trimEndFrames, range.max)
  return setItemDuration(project, itemId, end - item.trimStartFrames)
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
  const changed = change(project.items[index])
  // 変更関数が元の素材をそのまま返したら「変えられない」なので、Project も元のまま
  if (changed === project.items[index]) return project
  const items = project.items.map((item, i) => (i === index ? changed : item))
  return withItems(project, clampAfterResize(items))
}

/**
 * 素材を置き換える。尺やトランジションが変わると動画の「見える長さ」も変わるので、
 * そのたびに開始位置を上限内に切り詰める（上限は見える長さに依存し、clampAfterResize では分からない）。
 */
function withItems(project: Project, items: MediaItem[]): Project {
  return { ...project, items: clampTrims(items), updatedAt: new Date().toISOString() }
}
