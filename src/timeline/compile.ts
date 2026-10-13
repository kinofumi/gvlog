import type { TimelineItem } from '../model/types'

/** 素材がタイムライン上で占める区間。start は含み、end は含まない */
export type Segment = {
  itemId: string
  start: number
  end: number
}

/** 素材を順に並べて区間を計算する。M0 ではトランジション無し（cut のみ） */
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
