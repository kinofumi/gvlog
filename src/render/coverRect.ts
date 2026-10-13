/** 元画像から切り出す矩形（drawImage の sx, sy, sw, sh） */
export type SourceRect = {
  sx: number
  sy: number
  sw: number
  sh: number
}

/**
 * 元画像を出力に cover フィット（はみ出す側を切り落として画面いっぱいに）するとき、
 * 元画像のどの部分を使うかを返す。中央を使う。
 */
export function coverRect(srcW: number, srcH: number, dstW: number, dstH: number): SourceRect {
  const srcRatio = srcW / srcH
  const dstRatio = dstW / dstH
  if (srcRatio > dstRatio) {
    // 元画像のほうが横長 → 高さを合わせ、左右を切る
    const sw = srcH * dstRatio
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH }
  }
  // 元画像のほうが縦長（または同じ）→ 幅を合わせ、上下を切る
  const sh = srcW / dstRatio
  return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh }
}
