import { create } from 'zustand'
import type { ImportedVideo } from '../media/importVideo'
import { DEFAULT_PRESET } from '../model/defaults'
import type { Caption, KenBurns, PhotoInfo, Project, Transition, VideoInfo } from '../model/types'
import type { ProvidedImage } from '../render/renderFrame'
import * as actions from './projectActions'

/** 取り込んだ写真の実体。保存はしない（M4 で IndexedDB の Blob から復元する）。ImageBitmap は store が閉じる */
export type LoadedImage = ProvidedImage & { image: ImageBitmap }

/** 追加する写真 1 枚分 */
export type NewPhoto = { itemId: string; info: PhotoInfo; image: LoadedImage }
/** 追加する動画 1 本分。image はポスター（先頭フレームの画像）、video は取り込んだ動画の実体 */
export type NewVideo = {
  itemId: string
  info: VideoInfo
  image: LoadedImage
  video: ImportedVideo
}
export type NewEntry = NewPhoto | NewVideo

export type AppState = {
  project: Project
  /** itemId → 描画に使う画像。動画はポスター（サムネイルと、<video> が用意できるまでの代わり） */
  images: Record<string, LoadedImage>
  /** itemId → 取り込んだ動画（メモリ上のデータとデコード用の Input）。store が解放する */
  videos: Record<string, ImportedVideo>
  ui: {
    selectedItemId: string | null
    playheadFrame: number
    isPlaying: boolean
    /** 素材の取り込み中。素材が増える途中なので、その間は編集を止める */
    importing: boolean
    /** 書き出し中。使用中の画像を閉じないよう、素材の削除や差し替えを止める */
    exporting: boolean
  }

  /** まとめて追加（初期の尺は 5 秒、動画は元の長さまで）。入らなかった素材の画像と動画は解放する */
  addItems(entries: NewEntry[]): void
  removeItem(itemId: string): void
  moveItem(itemId: string, toIndex: number): void
  setItemDuration(itemId: string, frames: number): void
  setKenBurns(itemId: string, presetId: KenBurns['presetId']): void
  setCaption(itemId: string, caption: Caption | undefined): void
  setTransition(itemId: string, transition: Transition): void
  setTrimStart(itemId: string, trimStartFrames: number): void
  setTrimEnd(itemId: string, trimEndFrames: number): void
  select(itemId: string | null): void
  seek(frame: number): void
  setPlaying(isPlaying: boolean): void
  setImporting(importing: boolean): void
  setExporting(exporting: boolean): void
}

/**
 * アプリ全体のフラットな 1 ストア（plan §5）。
 * プロジェクトの変更は projectActions の純粋関数に任せ、ここでは画像の所有と UI 状態だけを扱う。
 */
export const useAppStore = create<AppState>((set, get) => ({
  project: actions.createProject(DEFAULT_PRESET),
  images: {},
  videos: {},
  ui: {
    selectedItemId: null,
    playheadFrame: 0,
    isPlaying: false,
    importing: false,
    exporting: false,
  },

  addItems: (entries) => {
    const before = get().project
    const project = actions.addItems(before, entries)
    const images = { ...get().images }
    const videos = { ...get().videos }
    for (const entry of entries) {
      const { itemId, image } = entry
      const video = 'video' in entry ? entry.video : null
      // この呼び出しで新しく入った素材か（前から同じ ID があれば重複として入らない）
      const isNew =
        !before.items.some((i) => i.itemId === itemId) &&
        project.items.some((i) => i.itemId === itemId) &&
        !(itemId in images)
      // 入った素材の画像と動画は store が持つ。入らなかった（上限・重複）分は使わないので解放する
      if (isNew) {
        images[itemId] = image
        if (video) videos[itemId] = video
      } else {
        image.image.close()
        video?.input.dispose()
      }
    }
    if (project === before) return
    set({ project, images, videos })
  },

  removeItem: (itemId) => {
    // 書き出し中は画像と動画を使っているので解放しない（UI でも止めるが、store でも守る）
    if (get().ui.exporting) return
    const project = actions.removeItem(get().project, itemId)
    if (project === get().project) return
    const { [itemId]: image, ...images } = get().images
    const { [itemId]: video, ...videos } = get().videos
    // 先に状態から外してから解放する（解放が失敗しても、閉じた画像が状態に残らない）
    set((s) => ({
      project,
      images,
      videos,
      ui: {
        ...s.ui,
        selectedItemId: s.ui.selectedItemId === itemId ? null : s.ui.selectedItemId,
        // 素材が無くなったら再生も止める（止めるボタンが押せなくなるのを防ぐ）
        isPlaying: project.items.length === 0 ? false : s.ui.isPlaying,
        playheadFrame: clampPlayhead(s.ui.playheadFrame, project),
      },
    }))
    image?.image.close()
    video?.input.dispose()
  },

  moveItem: (itemId, toIndex) =>
    set((s) => ({ project: actions.moveItem(s.project, itemId, toIndex) })),
  setItemDuration: (itemId, frames) =>
    set((s) => withProject(s, actions.setItemDuration(s.project, itemId, frames))),
  setKenBurns: (itemId, presetId) =>
    set((s) => ({ project: actions.setKenBurns(s.project, itemId, presetId) })),
  setCaption: (itemId, caption) =>
    set((s) => ({ project: actions.setCaption(s.project, itemId, caption) })),
  setTransition: (itemId, transition) =>
    set((s) => ({ project: actions.setTransition(s.project, itemId, transition) })),
  setTrimStart: (itemId, trimStartFrames) =>
    set((s) => ({ project: actions.setTrimStart(s.project, itemId, trimStartFrames) })),
  setTrimEnd: (itemId, trimEndFrames) =>
    set((s) => withProject(s, actions.setTrimEnd(s.project, itemId, trimEndFrames))),

  select: (selectedItemId) => set((s) => ({ ui: { ...s.ui, selectedItemId } })),
  seek: (frame) => {
    // 数でない値（空の入力など）は無視し、整数フレームに丸めて範囲に収める
    if (!Number.isFinite(frame)) return
    // 上限は出力の長さ − 1（素材が無ければ 0）
    const last = Math.max(0, actions.outputFramesOf(get().project) - 1)
    const next = Math.max(0, Math.min(Math.floor(frame), last))
    // 同じフレームなら通知しない（rAF は表示フレームより高い頻度で呼ばれる）
    if (next === get().ui.playheadFrame) return
    set((s) => ({
      ui: {
        ...s.ui,
        playheadFrame: next,
      },
    }))
  },
  setPlaying: (isPlaying) => set((s) => ({ ui: { ...s.ui, isPlaying } })),
  setImporting: (importing) => set((s) => ({ ui: { ...s.ui, importing } })),
  setExporting: (exporting) => set((s) => ({ ui: { ...s.ui, exporting } })),
}))

/** 再生位置を出力の長さ（0〜末尾）に収める。尺を縮めたり素材を外したりすると、今の位置が範囲の外に出るため */
function clampPlayhead(playheadFrame: number, project: Project): number {
  return Math.max(0, Math.min(playheadFrame, actions.outputFramesOf(project) - 1))
}

/** project を置き換え、再生位置も範囲に収める（尺が変わる操作で使う） */
function withProject(s: AppState, project: Project): Pick<AppState, 'project' | 'ui'> {
  if (project === s.project) return { project, ui: s.ui }
  return { project, ui: { ...s.ui, playheadFrame: clampPlayhead(s.ui.playheadFrame, project) } }
}
