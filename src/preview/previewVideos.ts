import type { ImportedVideo } from '../media/importVideo'
import { planFrame } from './videoPlan'

/** HTMLMediaElement.readyState: 現在の時刻のフレームが描ける */
const HAVE_CURRENT_DATA = 2

type Entry = {
  element: HTMLVideoElement
  url: string
  /** この要素に最後に要求した時刻（planFrame が循環を避けるために見る） */
  requested: number | null
}

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
      this.entries.set(itemId, { element, url, requested: null })
    }
  }

  /**
   * 素材内の時刻 timeSec のフレームを持つ <video> を返す。まだ描けなければ null（呼び出し側はポスターを描く）。
   * 何をするか（シーク、再生、停止）は planFrame が決める。
   * シーク中は前のフレームのまま返す（ポスターに切り替えるとスクラブ中にちらつく。seeked で描き直されるので数十 ms で正しくなる）。
   * 次に見える動画を先にシークしておくときは、playing を false にして呼び、戻り値は捨てる。
   */
  frameAt(itemId: string, timeSec: number, playing: boolean): HTMLVideoElement | null {
    const entry = this.entries.get(itemId)
    if (!entry) return null
    const el = entry.element
    const command = planFrame(
      {
        currentTime: el.currentTime,
        duration: el.duration,
        paused: el.paused,
        seeking: el.seeking,
        ended: el.ended,
        requested: entry.requested,
      },
      timeSec,
      playing,
    )
    if (command.seekTo !== null) {
      el.currentTime = command.seekTo
      entry.requested = command.seekTo
    }
    if (command.pause) el.pause()
    // play() の失敗（自動再生の制限など）は描画を止めない。止まったままならポスターや最後のフレームが出る
    if (command.play) el.play().catch(() => {})
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
