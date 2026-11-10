import { describe, expect, it } from 'vitest'
import type { VideoInfo } from '../model/types'
import { JOIN_FADE_FRAMES, JOIN_MAX_FRAMES, buildJoinProject } from './joinProject'

const video = (fileName: string, sourceDurationFrames: number): VideoInfo => ({
  kind: 'video',
  blobKey: fileName,
  thumbKey: fileName,
  fileName,
  width: 1080,
  height: 1920,
  sourceDurationFrames,
})

describe('buildJoinProject（全員の動画を順に並べて 1 本にするプロジェクト）', () => {
  it('各クリップの尺は元の動画の長さ、つなぎは白フェード、最後のクリップはカットのまま', () => {
    const p = buildJoinProject([
      { itemId: 'a', info: video('a.mp4', 450) },
      { itemId: 'b', info: video('b.mp4', 300) },
      { itemId: 'c', info: video('c.mp4', 420) },
    ])
    expect(p.items.map((i) => i.durationFrames)).toEqual([450, 300, 420])
    expect(p.items.map((i) => i.transitionOut)).toEqual([
      { type: 'fadeWhite', durationFrames: JOIN_FADE_FRAMES },
      { type: 'fadeWhite', durationFrames: JOIN_FADE_FRAMES },
      { type: 'cut', durationFrames: 0 },
    ])
  })

  it('上限は編集の 15 秒ではなく、つなげた全体が入る長さ', () => {
    const p = buildJoinProject([
      { itemId: 'a', info: video('a.mp4', 450) },
      { itemId: 'b', info: video('b.mp4', 450) },
    ])
    expect(p.preset.maxFrames).toBe(JOIN_MAX_FRAMES)
    expect(JOIN_MAX_FRAMES).toBeGreaterThanOrEqual(900)
  })

  it('1 秒に満たない動画でも尺は最小の 1 秒になる（足りない分は最後のフレームで止まる）', () => {
    const p = buildJoinProject([{ itemId: 'a', info: video('a.mp4', 10) }])
    expect(p.items[0].durationFrames).toBe(30)
  })

  it('クリップが無ければ素材も無い', () => {
    expect(buildJoinProject([]).items).toEqual([])
  })
})
