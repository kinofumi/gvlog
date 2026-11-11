/** 選べる BGM。ファイルは public/bgm/ に置く（ビルドでそのまま配られる）。曲を差し替えるときはここと public/bgm/ を直す */
export type BgmTrack = {
  id: string
  title: string
  /** public/bgm/ の中のファイル名 */
  file: string
  /** 出どころと利用条件（画面にも出す） */
  credit: string
}

/** 「なし」の ID */
export const NO_BGM = 'none'

/**
 * 仮の 3 曲（Python で合成した単純な電子音のループ。本番の曲が届いたら差し替える）。
 * 曲は出力の長さまでループし、末尾 2 秒でフェードアウトする（bgm/loop.ts）。
 */
export const BGM_TRACKS: BgmTrack[] = [
  { id: 'yasashii', title: 'やさしい（仮）', file: 'yasashii.mp3', credit: '仮の合成音' },
  { id: 'hazumu', title: 'はずむ（仮）', file: 'hazumu.mp3', credit: '仮の合成音' },
  { id: 'shizuka', title: 'しずか（仮）', file: 'shizuka.mp3', credit: '仮の合成音' },
]

/** 曲のファイルの URL（Pages のサブパスにも対応） */
export function bgmUrl(track: BgmTrack): string {
  return `${import.meta.env.BASE_URL}bgm/${track.file}`
}
