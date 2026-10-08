/** 共有シート（iOS なら「ビデオを保存」）で保存できる端末か */
export function canShareFile(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

export type ShareOutcome = 'shared' | 'cancelled' | 'failed'

/**
 * 共有シートを開く。ユーザーのタップの中から呼ぶこと（それ以外では開けない）。
 * キャンセル（AbortError）と失敗は区別して返す。
 */
export async function shareFile(file: File): Promise<ShareOutcome> {
  try {
    await navigator.share({ files: [file] })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    return 'failed'
  }
}

/** <a download> でダウンロードする（PC 向け。スマホでは共有の副手段） */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // すぐ revoke するとダウンロードが始まらないブラウザがあるので少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
