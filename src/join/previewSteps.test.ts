import { describe, expect, it } from 'vitest'
import { JOIN_COVER_FRAMES, JOIN_END_FRAMES, buildJoinProject, type JoinClip } from './joinProject'
import { previewSteps } from './previewSteps'

function clip(itemId: string, frames: number): JoinClip {
  return {
    itemId,
    info: {
      kind: 'video',
      blobKey: itemId,
      thumbKey: itemId,
      fileName: `${itemId}.mp4`,
      width: 1080,
      height: 1920,
      sourceDurationFrames: frames,
    },
  }
}

describe('previewSteps（簡易プレビューの順番）', () => {
  it('素材が無ければ空', () => {
    expect(previewSteps(buildJoinProject([]).items)).toEqual([])
  })

  it('表紙は止め絵（表紙の真ん中のフレーム）、動画は順に、終わりは白の止め絵', () => {
    const project = buildJoinProject([clip('a', 300), clip('b', 60)], '那珂湊')
    expect(previewSteps(project.items)).toEqual([
      {
        kind: 'card',
        itemId: 'join-cover',
        label: '表紙',
        frame: JOIN_COVER_FRAMES / 2,
        durationFrames: JOIN_COVER_FRAMES,
      },
      { kind: 'clip', itemId: 'a', label: '1 本目', durationFrames: 300 },
      { kind: 'clip', itemId: 'b', label: '2 本目', durationFrames: 60 },
      {
        kind: 'card',
        itemId: 'join-end',
        label: '終わり',
        frame: JOIN_COVER_FRAMES + 300 + 60 + JOIN_END_FRAMES / 2,
        durationFrames: JOIN_END_FRAMES,
      },
    ])
  })

  it('表紙が無ければ 1 本目から始まる', () => {
    const steps = previewSteps(buildJoinProject([clip('a', 300)]).items)
    expect(steps.map((s) => s.label)).toEqual(['1 本目', '終わり'])
    expect(steps[1]).toMatchObject({ kind: 'card', frame: 300 + JOIN_END_FRAMES / 2 })
  })
})
