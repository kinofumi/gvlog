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
import { clampDuration, defaultDuration, maxItems, outputFrames } from '../timeline/durations'
import { clampTrims, trimEndRange } from '../timeline/trim'

// プロジェクトを変える操作。すべて純粋関数で、新しい Project を返す（元は変えない）。
// 変えられないときは元の Project をそのまま返す（呼び出し側は同一性で判定できる）。
// 各素材の尺は独立で、1 つを変えても他は動かない。合計が preset.maxFrames を超えた分は出力で切る（ADR 015）。

export function createProject(preset: GroupPreset): Project {
  const now = new Date().toISOString()
  return {
    id: newId(),
    schemaVersion: 1,
    preset: { ...preset },
    locked: false,
    items: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** 写真を 1 枚末尾に追加する（addItems の薄い包み） */
export function addPhoto(project: Project, itemId: string, info: PhotoInfo): Project {
  return addItems(project, [{ itemId, info }])
}

/**
 * 写真と動画を複数まとめて末尾に追加する。既存の素材の尺は変えない。
 * 新しい素材の尺は 5 秒、動画は元の長さまで（defaultDuration）。合計が上限を超えても入れる（注意は UI が出す）。
 * 個数の上限を超える分と重複 ID は入れない。1 つも入らなければ元のまま。動画は開始位置 0 で始める。
 */
export function addItems(
  project: Project,
  entries: { itemId: string; info: MediaInfo }[],
): Project {
  const limit = maxItems(project.preset.maxFrames)
  const items: MediaItem[] = [...project.items]
  const accepted: { itemId: string; info: MediaInfo }[] = []
  for (const entry of entries) {
    if (items.length + accepted.length >= limit) break
    if (items.some((i) => i.itemId === entry.itemId)) continue
    if (accepted.some((a) => a.itemId === entry.itemId)) continue
    accepted.push(entry)
  }
  if (accepted.length === 0) return project

  const { maxFrames } = project.preset
  for (const { itemId, info } of accepted) {
    const transitionOut: Transition = { type: 'cut', durationFrames: 0 }
    if (info.kind === 'photo') {
      const durationFrames = defaultDuration(maxFrames)
      items.push({
        itemId,
        durationFrames,
        transitionOut,
        ...info,
        kenBurns: kenBurnsPreset('none'),
      })
    } else {
      const durationFrames = defaultDuration(maxFrames, info.sourceDurationFrames)
      items.push({ itemId, durationFrames, transitionOut, ...info, trimStartFrames: 0 })
    }
  }
  return withItems(project, clampAfterResize(items))
}

/** 素材を外す。残りの尺は変えない（前後のトランジションだけ整える） */
export function removeItem(project: Project, itemId: string): Project {
  if (!project.items.some((i) => i.itemId === itemId)) return project
  const rest = project.items.filter((i) => i.itemId !== itemId)
  return withItems(project, clampAfterResize(rest))
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

/** 1 つの尺を変える。他の素材は動かない。規則外（最小尺未満、上限超え）は規則内に止め、数でない値や同じ値なら元のまま */
export function setItemDuration(project: Project, itemId: string, frames: number): Project {
  const index = indexOf(project, itemId)
  if (index < 0) return project
  const durationFrames = clampDuration(frames, project.preset.maxFrames)
  if (durationFrames === null || durationFrames === project.items[index].durationFrames) {
    return project
  }
  const items = project.items.map((item, i) => (i === index ? { ...item, durationFrames } : item))
  return withItems(project, clampAfterResize(items))
}

/** 出力の長さ（フレーム数）。合計が上限を超えた分は切る。素材が無ければ 0 */
export function outputFramesOf(project: Project): number {
  return outputFrames(
    project.items.map((i) => i.durationFrames),
    project.preset.maxFrames,
  )
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
 * 尺の変更は setItemDuration と同じ規則（最小尺、上限）に従い、他の素材は動かない。
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
  const range = trimEndRange(item, visibleLength, project.preset.maxFrames)
  const end = Math.min(trimEndFrames, range.max)
  return setItemDuration(project, itemId, end - item.trimStartFrames)
}

// --- 内部の小さな助け ---

function indexOf(project: Project, itemId: string): number {
  return project.items.findIndex((i) => i.itemId === itemId)
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
