/** ファイル名に使えない文字を _ に置き換える */
function sanitize(text: string): string {
  return text.trim().replace(/[\\/:*?"<>|]/g, '_')
}

/**
 * 出力ファイル名: 名前_YYYYMMDD_HHMMSS.mp4（例: Vlog_20261008_140509.mp4）。
 * 名前は複数渡せる（編集はプリセット名だけ、つなげるは「つなげる」を足す）。空欄や使えない文字だけの名前は飛ばす。
 * 名前とスポットの入力をやめた（ADR 020）ので、同じ日に作った人どうしの動画を見分けられるように時刻を入れる。
 * 時刻は書き出しが終わったときのもの（呼び出し側の ExportPanel がそのときに呼ぶ）。
 */
export function buildFileName(names: string[], date: Date = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0')
  const ymd = `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}`
  const hms = `${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`
  // 置き換えの結果 _ だけになった名前（例: '?'）も空として扱う
  const parts = names.map(sanitize).filter((n) => !/^_*$/.test(n))
  if (parts.length === 0) parts.push('video')
  return `${parts.join('_')}_${ymd}_${hms}.mp4`
}
