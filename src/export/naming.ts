/** ファイル名に使えない文字を _ に置き換える */
function sanitize(text: string, fallback: string): string {
  const trimmed = text.trim()
  if (trimmed === '') return fallback
  return trimmed.replace(/[\\/:*?"<>|]/g, '_')
}

/** 出力ファイル名: プリセット名_メンバー名_スポット_YYYYMMDD.mp4 */
export function buildFileName(
  presetName: string,
  memberName: string,
  spot: string,
  date: Date = new Date(),
): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const parts = [
    sanitize(presetName, 'preset'),
    sanitize(memberName, 'member'),
    sanitize(spot, 'spot'),
    `${yyyy}${mm}${dd}`,
  ]
  return `${parts.join('_')}.mp4`
}
