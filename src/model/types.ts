// アプリ全体で使う型。時間はすべてフレーム番号（整数）で持つ（ADR 008）。

/** グループ共通のプリセット（固定モードでロックされる値） */
export type GroupPreset = {
  id: string
  name: string
  aspect: '16:9' | '9:16'
  width: number
  height: number
  /** v1 は 30 固定 */
  fps: 30
  /** 合計の尺（フレーム数）。300 = 10 秒。許容 150〜900 */
  totalFrames: number
}

/** 次の素材へのつなぎ。v1 は cut と crossfade だけ（ADR 005、009） */
export type Transition = {
  type: 'cut' | 'crossfade'
  durationFrames: number
}

/** キャプションの表示タイミング。コア区間の始まりからの遅れと、終わりからの早め */
export type CaptionTiming = {
  inOffsetFrames: number
  outOffsetFrames: number
}

export type Caption = CaptionTiming & {
  text: string
  presetId: 'band' | 'outline' | 'box'
  position: 'top' | 'middle' | 'bottom'
  size: 'L' | 'M' | 'S'
  overrides?: { textColor?: string; bgColor?: string; fontId?: string }
}

/** 写真の動き。cx, cy は 0..1 の正規化座標、zoom は cover 比（1 = 画面いっぱい） */
export type KenBurns = {
  presetId: 'none' | 'zoomIn' | 'zoomOut' | 'panLR' | 'panRL' | 'panTB' | 'panBT'
  from: { cx: number; cy: number; zoom: number }
  to: { cx: number; cy: number; zoom: number }
}

/**
 * タイムラインの計算に必要な最小限の情報。timeline/ の関数はこの型だけを見る。
 * MediaItem はこの型を含むので、そのまま渡せる。
 */
export type TimelineItem = {
  itemId: string
  /** タイムライン上の尺。全素材の合計 = preset.totalFrames が不変条件 */
  durationFrames: number
  /** 次の素材へのつなぎ。最後の素材では無視する */
  transitionOut?: Transition
  caption?: CaptionTiming
}

type ItemBase = TimelineItem & {
  kind: 'photo' | 'video'
  blobKey: string
  thumbKey: string
  fileName: string
  /** 回転適用後の表示サイズ */
  width: number
  height: number
  caption?: Caption
}

export type PhotoItem = ItemBase & {
  kind: 'photo'
  kenBurns: KenBurns
}

export type VideoItem = ItemBase & {
  kind: 'video'
  /** 元動画の尺（出力 fps 換算） */
  sourceDurationFrames: number
  /** 元動画のどこから使うか */
  trimStartFrames: number
}

export type MediaItem = PhotoItem | VideoItem

/** 写真を取り込んだ結果のうち、素材として保存する情報 */
export type PhotoInfo = {
  kind: 'photo'
  blobKey: string
  thumbKey: string
  fileName: string
  width: number
  height: number
}

/** 動画を取り込んだ結果のうち、素材として保存する情報。寸法は回転適用後 */
export type VideoInfo = {
  kind: 'video'
  blobKey: string
  thumbKey: string
  fileName: string
  width: number
  height: number
  /** 元動画の尺（出力 fps 換算） */
  sourceDurationFrames: number
}

export type MediaInfo = PhotoInfo | VideoInfo

export type Project = {
  id: string
  schemaVersion: 1
  /** スナップショット。リンクで配られたプリセットをそのまま保持する */
  preset: GroupPreset
  locked: boolean
  meta: { memberName: string; spot: string }
  items: MediaItem[]
  createdAt: string
  updatedAt: string
}
