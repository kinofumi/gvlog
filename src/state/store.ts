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
  }

  setMeta(meta: { memberName: string; spot: string }): void
  addPhoto(itemId: string, info: actions.PhotoInfo, image: LoadedImage): void
  removeItem(itemId: string): void
  moveItem(itemId: string, toIndex: number): void
  setItemDuration(itemId: string, frames: number): void
  setKenBurns(itemId: string, presetId: KenBurns['presetId']): void
  setCaption(itemId: string, caption: Caption | undefined): void
  setTransition(itemId: string, transition: Transition): void
  select(itemId: string | null): void
  seek(frame: number): void
  setPlaying(isPlaying: boolean): void
}

/**
 * アプリ全体のフラットな 1 ストア（plan §5）。
 * プロジェクトの変更は projectActions の純粋関数に任せ、ここでは画像の所有と UI 状態だけを扱う。
 */
export const useAppStore = create<AppState>((set, get) => ({
  project: actions.createProject(DEFAULT_PRESET, { memberName: '', spot: '' }),
  images: {},
  ui: { selectedItemId: null, playheadFrame: 0, isPlaying: false },

  setMeta: (meta) =>
    set((s) => ({ project: { ...s.project, meta, updatedAt: new Date().toISOString() } })),

  addPhoto: (itemId, info, image) => {
    const project = actions.addPhoto(get().project, itemId, info)
    if (project === get().project) {
      // 上限で追加できなかった。受け取った画像は使わないので閉じる
      image.image.close()
      return
    }
    set((s) => ({ project, images: { ...s.images, [itemId]: image } }))
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
      ui: { ...s.ui, selectedItemId: s.ui.selectedItemId === itemId ? null : s.ui.selectedItemId },
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
  seek: (frame) =>
    set((s) => ({
      ui: {
        ...s.ui,
        playheadFrame: Math.max(0, Math.min(frame, s.project.preset.totalFrames - 1)),
      },
    })),
  setPlaying: (isPlaying) => set((s) => ({ ui: { ...s.ui, isPlaying } })),
}))
