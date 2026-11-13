/** 見出しなどに添える小さな絵。外部のアイコン集は使わず、線だけの単純な SVG を手で書く（plan §10、ライブラリを増やさない） */
export type IconName =
  | 'photo'
  | 'film'
  | 'play'
  | 'download'
  | 'folder'
  | 'list'
  | 'text'
  | 'music'
  | 'link'
  | 'clock'
  | 'pin'
  | 'flag'

/** それぞれの絵のパス（viewBox 24x24、線の太さ 2、色は currentColor）。stroke だけで描き、塗りはしない */
const PATHS: Record<IconName, string> = {
  // 写真（枠、太陽、山）
  photo: 'M3 5h18v14H3z M8.5 10h.01 M21 15l-5-5-9 9',
  // フィルム（枠と両側の穴）
  film: 'M3 4h18v16H3z M7 4v16 M17 4v16 M3 9h4 M3 15h4 M17 9h4 M17 15h4',
  // 再生（丸の中の三角）
  play: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M10 8l6 4-6 4z',
  // 下向きの矢印と受け皿（保存・書き出し）
  download: 'M12 3v12 M7 10l5 5 5-5 M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  // フォルダ（集める）
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  // 箇条書き（順番）
  list: 'M9 6h12 M9 12h12 M9 18h12 M4 6h.01 M4 12h.01 M4 18h.01',
  // 文字（T の形。表紙・テロップ）
  text: 'M5 6h14 M12 6v13',
  // 音符（BGM）
  music: 'M9 18V6l10-2v12 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  // 鎖（つなげる）
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  // 時計（タイムスケジュール）
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
  // 地図のピン（おすすめの場所）
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  // 旗（イベントの名前）
  flag: 'M5 21V4 M5 4h13l-3 4 3 4H5',
}

type Props = {
  name: IconName
  /** 大きさや色のクラス。既定は 1.25rem 角、色は文字と同じ */
  className?: string
}

/** 飾りの絵。読み上げには出さない（意味は隣の文字が持つ） */
export function Icon({ name, className = 'h-5 w-5' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
