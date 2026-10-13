import type { TimelineItem, Transition } from '../model/types'
import { MIN_CAPTION_FRAMES, clampTransition } from './clamp'
import { checkDurations } from './durations'

/** 素材がタイムライン上で占める区間。start は含み、end は含まない */
export type Segment = {
  itemId: string
  start: number
  end: number
}

/** 素材を順に並べて区間を計算する。トランジション無し（cut のみ）の単純版。M0 の書き出しで使う */
export function compileSegments(items: TimelineItem[]): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  for (const item of items) {
    segments.push({ itemId: item.itemId, start: cursor, end: cursor + item.durationFrames })
    cursor += item.durationFrames
  }
  return segments
}

/** そのフレームで見える区間を返す。無ければ null */
export function segmentAt(segments: Segment[], frame: number): Segment | null {
  for (const segment of segments) {
    if (frame >= segment.start && frame < segment.end) return segment
  }
  return null
}

/** 次の素材へのトランジション区間。start は含み、end は含まない。前後の素材が同時に見える */
export type TransitionWindow = {
  type: Transition['type']
  start: number
  end: number
}

/** トランジション込みの区間。すべてフレーム番号。end 側は含まない */
export type CompiledItem = {
  itemId: string
  /** 均等割りの区間（この素材が主役の時間） */
  coreStart: number
  coreEnd: number
  /** 画面に見えている区間（前後のトランジション分だけ広がる） */
  visibleStart: number
  visibleEnd: number
  transitionOut: TransitionWindow | null
}

/**
 * 各素材のコア区間と見える区間を計算する。
 * トランジション d は境界をまたいで、前の素材に ceil(d/2)、後の素材に floor(d/2) を割り当てる。
 * 長すぎる d は前後の短い方の尺の半分に切り詰める。末尾の素材の transitionOut は無視する。
 */
export function compileTimeline(items: TimelineItem[]): CompiledItem[] {
  const compiled: CompiledItem[] = []
  let cursor = 0
  // 前の素材のトランジションで、この素材が早く見え始める分
  let leadIn = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const coreStart = cursor
    const coreEnd = cursor + item.durationFrames
    const following = items[i + 1]

    let transitionOut: TransitionWindow | null = null
    let tailOut = 0
    if (item.transitionOut && item.transitionOut.type !== 'cut' && following) {
      const d = clampTransition(
        item.transitionOut.durationFrames,
        item.durationFrames,
        following.durationFrames,
      )
      if (d > 0) {
        const before = Math.floor(d / 2)
        tailOut = Math.ceil(d / 2)
        transitionOut = {
          type: item.transitionOut.type,
          start: coreEnd - before,
          end: coreEnd + tailOut,
        }
      }
    }

    compiled.push({
      itemId: item.itemId,
      coreStart,
      coreEnd,
      visibleStart: coreStart - leadIn,
      visibleEnd: coreEnd + tailOut,
      transitionOut,
    })

    cursor = coreEnd
    leadIn = transitionOut ? coreEnd - transitionOut.start : 0
  }
  return compiled
}

/** そのフレームで見えている素材（0〜2 個、タイムライン順） */
export function itemsAt(compiled: CompiledItem[], frame: number): CompiledItem[] {
  return compiled.filter((c) => frame >= c.visibleStart && frame < c.visibleEnd)
}

/** そのフレームがトランジション区間の中なら、種類と進行度（0 以上 1 未満）。外なら null */
export function transitionAt(
  compiled: CompiledItem[],
  frame: number,
): { type: Transition['type']; progress: number } | null {
  for (const c of compiled) {
    const w = c.transitionOut
    if (w && frame >= w.start && frame < w.end) {
      return { type: w.type, progress: (frame - w.start) / (w.end - w.start) }
    }
  }
  return null
}

/**
 * タイムライン全体の不変条件を確かめ、問題を日本語の文で返す（なければ空）。
 * compileTimeline は入力を信用して計算するだけなので、状態を変えた側はこれで確認してから渡す。
 */
export function checkTimeline(items: TimelineItem[], totalFrames: number): string[] {
  const errors = checkDurations(
    items.map((item) => item.durationFrames),
    totalFrames,
  )
  const seen = new Set<string>()
  items.forEach((item, i) => {
    if (seen.has(item.itemId)) errors.push(`素材 ID「${item.itemId}」が重複しています。`)
    seen.add(item.itemId)

    const following = items[i + 1]
    const t = item.transitionOut
    if (t && t.type !== 'cut' && following) {
      const limit = clampTransition(t.durationFrames, item.durationFrames, following.durationFrames)
      if (t.durationFrames > limit) {
        errors.push(
          `素材 ${i + 1} のトランジション（${t.durationFrames}）が上限（${limit}）を超えています。`,
        )
      }
    }

    const c = item.caption
    if (c) {
      const minShow = Math.min(MIN_CAPTION_FRAMES, item.durationFrames)
      if (item.durationFrames - c.inOffsetFrames - c.outOffsetFrames < minShow) {
        errors.push(
          `素材 ${i + 1} のキャプションの表示区間が足りません（${MIN_CAPTION_FRAMES} フレーム以上必要）。`,
        )
      }
    }
  })
  return errors
}
