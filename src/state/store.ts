import { create } from 'zustand'
import { DEFAULT_PRESET } from '../model/defaults'
import type { Caption, KenBurns, Project, Transition } from '../model/types'
import type { ProvidedImage } from '../render/renderFrame'
import * as actions from './projectActions'

/** 取り込んだ写真の実体。保存はしない（M4 で IndexedDB の Blob から復元する）。ImageBitmap は store が閉じる */
export type LoadedImage = ProvidedImage & { image: ImageBitmap }

export type AppState = {
  project: Project
  /** itemId → 描画に使う画像 */
  images: Record<string, LoadedImage>
  ui: {
    selectedItemId: string | null
    playheadFrame: number
    isPlaying: boolean
    /** 写真の取り込み中。追加のたびに尺を割り直すので、その間は編集を止める */
    importing: boolean
  }

  setMeta(meta: { memberName: string; spot: string }): void
  addPhoto(itemId: string, info: actions.PhotoInfo, image: LoadedImage): void
  /** まとめて追加（均等割りは 1 回）。入らなかった写真の画像は閉じる */
  addPhotos(photos: { itemId: string; info: actions.PhotoInfo; image: LoadedImage }[]): void
  removeItem(itemId: string): void
  moveItem(itemId: string, toIndex: number): void
  setItemDuration(itemId: string, frames: number): void
  setKenBurns(itemId: string, presetId: KenBurns['presetId']): void
  setCaption(itemId: string, caption: Caption | undefined): void
  setTransition(itemId: string, transition: Transition): void
  select(itemId: string | null): void
  seek(frame: number): void
  setPlaying(isPlaying: boolean): void
  setImporting(importing: boolean): void
}

/**
 * アプリ全体のフラットな 1 ストア（plan §5）。
 * プロジェクトの変更は projectActions の純粋関数に任せ、ここでは画像の所有と UI 状態だけを扱う。
 */
export const useAppStore = create<AppState>((set, get) => ({
  project: actions.createProject(DEFAULT_PRESET, { memberName: '', spot: '' }),
  images: {},
  ui: { selectedItemId: null, playheadFrame: 0, isPlaying: false, importing: false },

  setMeta: (meta) => set((s) => ({ project: actions.setMeta(s.project, meta) })),

  addPhoto: (itemId, info, image) => get().addPhotos([{ itemId, info, image }]),

  addPhotos: (photos) => {
    const before = get().project
    const project = actions.addPhotos(before, photos)
    const images = { ...get().images }
    for (const { itemId, image } of photos) {
      const isNew = project.items.some((i) => i.itemId === itemId) && !(itemId in images)
      // 入った写真の画像は store が持つ。入らなかった（上限・重複）画像は使わないので閉じる
      if (isNew) images[itemId] = image
      else image.image.close()
    }
    if (project === before) return
    set({ project, images })
  },

  removeItem: (itemId) => {
    const project = actions.removeItem(get().project, itemId)
    if (project === get().project) return
    const images = { ...get().images }
    images[itemId]?.image.close()
    delete images[itemId]
    set((s) => ({
      project,
      images,
      ui: {
        ...s.ui,
        selectedItemId: s.ui.selectedItemId === itemId ? null : s.ui.selectedItemId,
        // 素材が無くなったら再生も止める（止めるボタンが押せなくなるのを防ぐ）
        isPlaying: project.items.length === 0 ? false : s.ui.isPlaying,
      },
    }))
  },

  moveItem: (itemId, toIndex) =>
    set((s) => ({ project: actions.moveItem(s.project, itemId, toIndex) })),
  setItemDuration: (itemId, frames) =>
    set((s) => ({ project: actions.setItemDuration(s.project, itemId, frames) })),
  setKenBurns: (itemId, presetId) =>
    set((s) => ({ project: actions.setKenBurns(s.project, itemId, presetId) })),
  setCaption: (itemId, caption) =>
    set((s) => ({ project: actions.setCaption(s.project, itemId, caption) })),
  setTransition: (itemId, transition) =>
    set((s) => ({ project: actions.setTransition(s.project, itemId, transition) })),

  select: (selectedItemId) => set((s) => ({ ui: { ...s.ui, selectedItemId } })),
  seek: (frame) => {
    // 数でない値（空の入力など）は無視し、整数フレームに丸めて範囲に収める
    if (!Number.isFinite(frame)) return
    const next = Math.max(0, Math.min(Math.floor(frame), get().project.preset.totalFrames - 1))
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
}))
