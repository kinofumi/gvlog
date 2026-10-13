import type { ImportedVideo } from '../media/importVideo'

/** 時刻が合っているとみなす許容（秒）。停止中のシークは細かく、再生中のずれは 100ms まで許す（plan §3.3） */
const SEEK_TOLERANCE_SEC = 0.02
const DRIFT_TOLERANCE_SEC = 0.1

/** HTMLMediaElement.readyState: 現在の時刻のフレームが描ける */
const HAVE_CURRENT_DATA = 2

type Entry = { element: HTMLVideoElement; url: string }

/**
 * プレビュー用の <video> を素材ごとに 1 つ持ち、再生と時刻合わせを引き受ける。
 * 画面には出さず、描画は renderFrame が drawImage で行う。
 * フレームが用意できた（seeked / loadeddata）ときは onFrameReady で知らせるので、呼び出し側は描き直す。
 */
export class PreviewVideos {
  private readonly entries = new Map<string, Entry>()
  private readonly onFrameReady: () => void

  constructor(onFrameReady: () => void) {
    this.onFrameReady = onFrameReady
  }

  /** store の動画の集合に合わせて要素を作り、無くなった分は捨てる */
  sync(videos: Record<string, ImportedVideo>): void {
    for (const [itemId, entry] of this.entries) {
      if (!(itemId in videos)) {
        this.release(entry)
        this.entries.delete(itemId)
      }
    }
    for (const [itemId, video] of Object.entries(videos)) {
      if (this.entries.has(itemId)) continue
      const url = URL.createObjectURL(video.blob)
      const element = document.createElement('video')
      element.muted = true
      element.playsInline = true
      element.preload = 'auto'
      element.addEventListener('seeked', this.onFrameReady)
      element.addEventListener('loadeddata', this.onFrameReady)
      element.src = url
      this.entries.set(itemId, { element, url })
    }
  }

  /**
   * 素材内の時刻 timeSec のフレームを持つ <video> を返す。まだ描けなければ null（呼び出し側はポスターを描く）。
   * 停止中: 時刻が違えばシークする（seeked のあとで描き直される）。
   * 再生中: 止まっていれば play()、ずれが大きければ時刻を合わせる。
   */
  frameAt(itemId: string, timeSec: number, playing: boolean): HTMLVideoElement | null {
    const entry = this.entries.get(itemId)
    if (!entry) return null
    const el = entry.element
    const drift = Math.abs(el.currentTime - timeSec)
    if (playing) {
      if (drift > DRIFT_TOLERANCE_SEC) el.currentTime = timeSec
      // play() の失敗（自動再生の制限など）は描画を止めない。止まったままならポスターや最後のフレームが出る
      if (el.paused) el.play().catch(() => {})
    } else {
      if (!el.paused) el.pause()
      if (drift > SEEK_TOLERANCE_SEC && !el.seeking) el.currentTime = timeSec
    }
    return el.readyState >= HAVE_CURRENT_DATA ? el : null
  }

  /** このフレームで見えていない動画を止める（再生が進んで次に見えるときは frameAt が時刻を合わせる） */
  pauseExcept(visibleIds: Set<string>): void {
    for (const [itemId, entry] of this.entries) {
      if (!visibleIds.has(itemId) && !entry.element.paused) entry.element.pause()
    }
  }

  dispose(): void {
    for (const entry of this.entries.values()) this.release(entry)
    this.entries.clear()
  }

  private release(entry: Entry): void {
    entry.element.pause()
    entry.element.removeEventListener('seeked', this.onFrameReady)
    entry.element.removeEventListener('loadeddata', this.onFrameReady)
    entry.element.removeAttribute('src')
    entry.element.load()
    URL.revokeObjectURL(entry.url)
  }
}
