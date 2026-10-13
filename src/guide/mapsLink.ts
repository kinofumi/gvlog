/**
 * 場所の名前から Google マップの検索リンクを作る（Maps URLs の search 形式）。
 * 座標を持たなくても、アプリやブラウザでその場所が開く。
 */
export function mapsSearchUrl(placeName: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`
}
