// アプリ全体で使う型。M0 では書き出しに必要な最小限だけ定義する。

/** グループ共通のプリセット（固定モードでロックされる値） */
export type GroupPreset = {
  id: string
  name: string
  aspect: '16:9' | '9:16'
  width: number
  height: number
  /** v1 は 30 固定 */
  fps: 30
  /** 合計の尺（フレーム数）。300 = 10 秒 */
  totalFrames: number
}

/** タイムライン上の 1 素材。M0 では尺だけ持つ */
export type TimelineItem = {
  itemId: string
  durationFrames: number
}
