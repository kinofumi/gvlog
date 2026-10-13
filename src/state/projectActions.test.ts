import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET } from '../model/defaults'
import type { PhotoItem, Project } from '../model/types'
import { checkTimeline } from '../timeline/compile'
import {
  addPhoto,
  createProject,
  moveItem,
  removeItem,
  setCaption,
  setItemDuration,
  setKenBurns,
  setTransition,
} from './projectActions'

const photoInfo = (n: number) => ({
  blobKey: `blob-${n}`,
  thumbKey: `thumb-${n}`,
  fileName: `p${n}.jpg`,
  width: 4000,
  height: 3000,
})

function withPhotos(n: number): Project {
  let p = createProject(DEFAULT_PRESET, { memberName: '木下', spot: '清水寺' })
  for (let i = 1; i <= n; i++) p = addPhoto(p, `p${i}`, photoInfo(i))
  return p
}

const durations = (p: Project) => p.items.map((i) => i.durationFrames)

describe('createProject', () => {
  it('プリセットのスナップショットと空の素材で始まる', () => {
    const p = createProject(DEFAULT_PRESET, { memberName: '木下', spot: '清水寺' })
    expect(p.preset).toEqual(DEFAULT_PRESET)
    expect(p.preset).not.toBe(DEFAULT_PRESET)
    expect(p.items).toEqual([])
    expect(p.schemaVersion).toBe(1)
    expect(p.id).not.toBe('')
  })
})

describe('addPhoto（写真を末尾に追加し、尺を均等に割り直す）', () => {
  it('1 枚目は総尺すべて、2 枚目で半分ずつ', () => {
    expect(durations(withPhotos(1))).toEqual([300])
    expect(durations(withPhotos(2))).toEqual([150, 150])
    expect(durations(withPhotos(3))).toEqual([100, 100, 100])
  })

  it('追加した写真は Ken Burns が none、キャプション無し、cut でつなぐ', () => {
    const item = withPhotos(1).items[0] as PhotoItem
    expect(item.kind).toBe('photo')
    expect(item.kenBurns.presetId).toBe('none')
    expect(item.caption).toBeUndefined()
    expect(item.transitionOut).toEqual({ type: 'cut', durationFrames: 0 })
  })

  it('上限（10 秒なら 10 枚）を超えたら追加せず元のまま', () => {
    const ten = withPhotos(10)
    const eleven = addPhoto(ten, 'p11', photoInfo(11))
    expect(eleven).toBe(ten)
  })

  it('追加後も不変条件を満たす', () => {
    const p = withPhotos(7)
    expect(checkTimeline(p.items, p.preset.totalFrames)).toEqual([])
  })
})

describe('removeItem', () => {
  it('削除すると残りで均等に割り直す', () => {
    const p = removeItem(withPhotos(3), 'p2')
    expect(p.items.map((i) => i.itemId)).toEqual(['p1', 'p3'])
    expect(durations(p)).toEqual([150, 150])
  })

  it('無い ID なら元のまま', () => {
    const p = withPhotos(2)
    expect(removeItem(p, 'nope')).toBe(p)
  })
})

describe('moveItem（並べ替え。尺は素材についていく）', () => {
  it('前へ・後ろへ動かせる', () => {
    const p = setItemDuration(withPhotos(3), 'p1', 150)
    expect(durations(p)).toEqual([150, 75, 75])
    const moved = moveItem(p, 'p1', 2)
    expect(moved.items.map((i) => i.itemId)).toEqual(['p2', 'p3', 'p1'])
    expect(durations(moved)).toEqual([75, 75, 150])
  })

  it('範囲外の位置や無い ID なら元のまま', () => {
    const p = withPhotos(2)
    expect(moveItem(p, 'p1', 5)).toBe(p)
    expect(moveItem(p, 'nope', 0)).toBe(p)
  })
})

describe('setItemDuration（尺の手動調整）', () => {
  it('差分は他へ比例配分され、合計は総尺のまま', () => {
    const p = setItemDuration(withPhotos(3), 'p1', 200)
    expect(durations(p)).toEqual([200, 50, 50])
  })

  it('変えたあとはトランジションとキャプションが切り詰められる', () => {
    let p = withPhotos(2)
    p = setTransition(p, 'p1', { type: 'crossfade', durationFrames: 60 })
    p = setCaption(p, 'p1', {
      text: 'a',
      presetId: 'band',
      position: 'bottom',
      size: 'M',
      inOffsetFrames: 100,
      outOffsetFrames: 0,
    })
    p = setItemDuration(p, 'p1', 40)
    expect(p.items[0].transitionOut).toEqual({ type: 'crossfade', durationFrames: 20 })
    expect(p.items[0].caption?.inOffsetFrames).toBe(24)
    expect(checkTimeline(p.items, p.preset.totalFrames)).toEqual([])
  })

  it('変更できない（1 枚だけ）なら元のまま', () => {
    const p = withPhotos(1)
    expect(setItemDuration(p, 'p1', 100)).toBe(p)
  })
})

describe('setKenBurns / setCaption / setTransition', () => {
  it('Ken Burns はプリセット名で設定する', () => {
    const p = setKenBurns(withPhotos(1), 'p1', 'zoomIn')
    expect((p.items[0] as PhotoItem).kenBurns.to.zoom).toBe(1.2)
  })

  it('キャプションは undefined で外せる', () => {
    let p = setCaption(withPhotos(1), 'p1', {
      text: 'a',
      presetId: 'band',
      position: 'bottom',
      size: 'M',
      inOffsetFrames: 0,
      outOffsetFrames: 0,
    })
    expect(p.items[0].caption?.text).toBe('a')
    p = setCaption(p, 'p1', undefined)
    expect(p.items[0].caption).toBeUndefined()
  })

  it('トランジションは上限に切り詰めて保存する', () => {
    const p = setTransition(withPhotos(2), 'p1', { type: 'crossfade', durationFrames: 500 })
    expect(p.items[0].transitionOut).toEqual({ type: 'crossfade', durationFrames: 75 })
  })

  it('更新のたびに updatedAt が進み、元のオブジェクトは変わらない', () => {
    const before = withPhotos(1)
    const after = setKenBurns(before, 'p1', 'zoomIn')
    expect(after).not.toBe(before)
    expect((before.items[0] as PhotoItem).kenBurns.presetId).toBe('none')
    expect(after.updatedAt >= before.updatedAt).toBe(true)
  })
})
