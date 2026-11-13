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
 * 本番の 3 曲。利用者が Suno（有料の Pro プラン。商用利用を含めて使える）で生成したインスト曲（2026-11-13）。
 * 元の WAV は bgm-src/（コミットしない）、配信用の MP3 は scripts/make-bgm.sh でモノラル・-16 LUFS・44.1 kHz にそろえて作る。
 * 曲は出力の長さまでループし、末尾 2 秒でフェードアウトする（bgm/loop.ts）。
 */
/** 3 曲とも同じ出どころ（画面の曲名の横に出す） */
const CREDIT = 'Suno で生成（Pro プラン、2026-11）'

export const BGM_TRACKS: BgmTrack[] = [
  { id: 'yasashii', title: 'やさしい', file: 'yasashii.mp3', credit: CREDIT },
  { id: 'hazumu', title: 'はずむ', file: 'hazumu.mp3', credit: CREDIT },
  { id: 'shizuka', title: 'しずか', file: 'shizuka.mp3', credit: CREDIT },
]

/** 曲のファイルの URL（Pages のサブパスにも対応） */
export function bgmUrl(track: BgmTrack): string {
  return `${import.meta.env.BASE_URL}bgm/${track.file}`
}
