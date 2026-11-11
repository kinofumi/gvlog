import { describe, expect, it } from 'vitest'
import type { VideoInfo } from '../model/types'
import {
  JOIN_COVER_FRAMES,
  JOIN_COVER_ID,
  JOIN_END_FRAMES,
  JOIN_END_ID,
  JOIN_FADE_FRAMES,
  JOIN_MAX_FRAMES,
  buildJoinProject,
} from './joinProject'

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
  it('各クリップの尺は元の動画の長さ、つなぎは白フェード、最後のクリップも白フェードで終わりにつなぐ', () => {
    const p = buildJoinProject([
      { itemId: 'a', info: video('a.mp4', 450) },
      { itemId: 'b', info: video('b.mp4', 300) },
      { itemId: 'c', info: video('c.mp4', 420) },
    ])
    expect(p.items.map((i) => i.durationFrames)).toEqual([450, 300, 420, JOIN_END_FRAMES])
    expect(p.items.map((i) => i.transitionOut)).toEqual([
      { type: 'fadeWhite', durationFrames: JOIN_FADE_FRAMES },
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

  it('1 秒に満たない動画でも尺は最小の 1 秒になる（足りない分は最後のフレームで止まる）。短いので白フェードは半分に切り詰められる', () => {
    const p = buildJoinProject([{ itemId: 'a', info: video('a.mp4', 10) }])
    expect(p.items[0].durationFrames).toBe(30)
    expect(p.items[0].transitionOut).toEqual({ type: 'fadeWhite', durationFrames: 15 })
  })

  it('クリップが無ければ素材も無い（表紙の文字があっても）', () => {
    expect(buildJoinProject([]).items).toEqual([])
    expect(buildJoinProject([], '那珂湊散策').items).toEqual([])
  })
})

describe('buildJoinProject の表紙と終わり', () => {
  const clips = [
    { itemId: 'a', info: video('a.mp4', 450) },
    { itemId: 'b', info: video('b.mp4', 300) },
  ]

  it('表紙の文字があれば、先頭に 3 秒の表紙（文字はテロップ）を置き、白フェードで 1 本目につなぐ', () => {
    // 前後の改行は除く（textarea では末尾に改行が付きやすく、空行が中央配置をずらす）
    const p = buildJoinProject(clips, '\n那珂湊散策\n2026.11.11\n')
    const cover = p.items[0]
    expect(cover.itemId).toBe(JOIN_COVER_ID)
    expect(cover.kind).toBe('photo')
    expect(cover.durationFrames).toBe(JOIN_COVER_FRAMES)
    expect(cover.caption?.text).toBe('那珂湊散策\n2026.11.11')
    expect(cover.caption?.position).toBe('middle')
    expect(cover.transitionOut).toEqual({ type: 'fadeWhite', durationFrames: JOIN_FADE_FRAMES })
    expect(p.items[1].itemId).toBe('a')
  })

  it('最後は白フェードで約 1 秒の白い終わりにつなぐ（白フェードアウトして終わる）。白フェードは切り詰められない', () => {
    const p = buildJoinProject(clips, '')
    const end = p.items[p.items.length - 1]
    expect(end.itemId).toBe(JOIN_END_ID)
    expect(end.kind).toBe('photo')
    expect(end.durationFrames).toBe(JOIN_END_FRAMES)
    expect(end.transitionOut).toEqual({ type: 'cut', durationFrames: 0 })
    expect(p.items[p.items.length - 2].transitionOut).toEqual({
      type: 'fadeWhite',
      durationFrames: JOIN_FADE_FRAMES,
    })
  })

  it('表紙の文字が空白だけなら表紙は置かない。終わりは置く', () => {
    const p = buildJoinProject(clips, '  \n ')
    expect(p.items.map((i) => i.itemId)).toEqual(['a', 'b', JOIN_END_ID])
  })

  it('表紙と終わりを含めた並びと合計', () => {
    const p = buildJoinProject(clips, '表紙')
    expect(p.items.map((i) => i.itemId)).toEqual([JOIN_COVER_ID, 'a', 'b', JOIN_END_ID])
    expect(p.items.reduce((sum, i) => sum + i.durationFrames, 0)).toBe(
      JOIN_COVER_FRAMES + 450 + 300 + JOIN_END_FRAMES,
    )
  })
})
