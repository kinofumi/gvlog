/** ファイル名に使えない文字を _ に置き換える。空欄は '' のまま返す */
function sanitize(text: string): string {
  return text.trim().replace(/[\\/:*?"<>|]/g, '_')
}

/**
 * 出力ファイル名: 名前_YYYYMMDD_HHMM.mp4（例: Vlog_20261008_1405.mp4）。
 * 名前は複数渡せる（編集はプリセット名だけ、つなげるは「つなげる」を足す）。空欄は飛ばす。
 * 名前とスポットの入力をやめた（ADR 020）ので、同じ日に作った人どうしの動画を見分けられるように時刻を入れる。
 */
export function buildFileName(names: string[], date: Date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const parts = names.map(sanitize).filter((n) => n !== '')
  if (parts.length === 0) parts.push('video')
  return `${parts.join('_')}_${yyyy}${mm}${dd}_${hh}${mi}.mp4`
}
