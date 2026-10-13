import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET } from '../model/defaults'
import type { PhotoItem, Project, VideoItem } from '../model/types'
import { checkTimeline } from '../timeline/compile'
import {
  addItems,
  addPhoto,
  createProject,
  moveItem,
  removeItem,
  setCaption,
  setItemDuration,
  setKenBurns,
  setMeta,
  setTransition,
  setTrimStart,
  type PhotoInfo,
  type VideoInfo,
} from './projectActions'

const photoInfo = (n: number): PhotoInfo => ({
  kind: 'photo',
  blobKey: `blob-${n}`,
  thumbKey: `thumb-${n}`,
  fileName: `p${n}.jpg`,
  width: 4000,
  height: 3000,
})

/** 元動画の尺を指定した動画の情報 */
const videoInfo = (n: number, sourceDurationFrames: number): VideoInfo => ({
  kind: 'video',
  blobKey: `blob-${n}`,
  thumbKey: `thumb-${n}`,
  fileName: `v${n}.mov`,
  width: 1080,
  height: 1920,
  sourceDurationFrames,
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

  it('同じ ID の再追加は拒否して元のまま（素材が二重にならない）', () => {
    const p = withPhotos(1)
    expect(addPhoto(p, 'p1', photoInfo(1))).toBe(p)
  })

  it('追加後も不変条件を満たす', () => {
    const p = withPhotos(7)
    expect(checkTimeline(p.items, p.preset.totalFrames)).toEqual([])
  })
})

describe('addItems（複数をまとめて追加。均等割りは 1 回だけ）', () => {
  it('まとめて追加しても 1 枚ずつ追加したのと同じ結果', () => {
    const p = addItems(withPhotos(1), [
      { itemId: 'p2', info: photoInfo(2) },
      { itemId: 'p3', info: photoInfo(3) },
    ])
    expect(p.items.map((i) => i.itemId)).toEqual(['p1', 'p2', 'p3'])
    expect(durations(p)).toEqual([100, 100, 100])
  })

  it('上限を超える分は入れず、重複 ID は飛ばす。1 枚も入らなければ元のまま', () => {
    const nine = withPhotos(9)
    const p = addItems(nine, [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'p10', info: photoInfo(10) },
      { itemId: 'p11', info: photoInfo(11) },
    ])
    expect(p.items).toHaveLength(10)
    expect(p.items[9].itemId).toBe('p10')
    const ten = withPhotos(10)
    expect(addItems(ten, [{ itemId: 'p11', info: photoInfo(11) }])).toBe(ten)
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

  it('範囲外の位置や無い ID、同じ位置への移動なら元のまま', () => {
    const p = withPhotos(2)
    expect(moveItem(p, 'p1', 5)).toBe(p)
    expect(moveItem(p, 'nope', 0)).toBe(p)
    expect(moveItem(p, 'p1', 0)).toBe(p)
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

  it('変えられない素材（写真でない）への Ken Burns 設定は元のまま', () => {
    const p = addItems(createProject(DEFAULT_PRESET, { memberName: '', spot: '' }), [
      { itemId: 'v1', info: videoInfo(1, 300) },
    ])
    expect(setKenBurns(p, 'v1', 'zoomIn')).toBe(p)
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

  it('末尾の素材でも、長さは 0 以上の整数に整えて保存する（次に素材を足したとき上限で切り詰められる）', () => {
    const p = withPhotos(2)
    expect(
      setTransition(p, 'p2', { type: 'crossfade', durationFrames: 12.7 }).items[1].transitionOut,
    ).toEqual({
      type: 'crossfade',
      durationFrames: 12,
    })
    expect(
      setTransition(p, 'p2', { type: 'crossfade', durationFrames: -3 }).items[1].transitionOut,
    ).toEqual({
      type: 'crossfade',
      durationFrames: 0,
    })
    expect(
      setTransition(p, 'p2', { type: 'crossfade', durationFrames: Number.NaN }).items[1]
        .transitionOut,
    ).toEqual({
      type: 'crossfade',
      durationFrames: 0,
    })
  })

  it('同じ値の設定、無いキャプションを外す、は元のまま', () => {
    const p = withPhotos(2)
    expect(setTransition(p, 'p1', { type: 'cut', durationFrames: 0 })).toBe(p)
    expect(setCaption(p, 'p1', undefined)).toBe(p)
    expect(setKenBurns(p, 'p1', 'none')).toBe(p)
  })

  it('setMeta は名前とスポットを置き換え、渡したオブジェクトを参照で持たない', () => {
    const meta = { memberName: '山田', spot: '金閣寺' }
    const p = setMeta(withPhotos(1), meta)
    meta.spot = '書き換え'
    expect(p.meta).toEqual({ memberName: '山田', spot: '金閣寺' })
  })

  it('更新のたびに updatedAt が進み、元のオブジェクトは変わらない', () => {
    const before = withPhotos(1)
    const after = setKenBurns(before, 'p1', 'zoomIn')
    expect(after).not.toBe(before)
    expect((before.items[0] as PhotoItem).kenBurns.presetId).toBe('none')
    expect(after.updatedAt >= before.updatedAt).toBe(true)
  })
})

describe('動画の追加と開始位置（トリム）', () => {
  const empty = () => createProject(DEFAULT_PRESET, { memberName: '', spot: '' })

  it('写真と動画をまとめて追加できる。動画は開始位置 0、元動画の尺を持つ', () => {
    const p = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'v1', info: videoInfo(1, 600) },
    ])
    expect(p.items.map((i) => i.kind)).toEqual(['photo', 'video'])
    const video = p.items[1] as VideoItem
    expect(video.trimStartFrames).toBe(0)
    expect(video.sourceDurationFrames).toBe(600)
    expect(video.transitionOut).toEqual({ type: 'cut', durationFrames: 0 })
    expect(durations(p)).toEqual([150, 150])
  })

  it('開始位置は 0〜（元動画の尺 − 見える長さ）に収めて保存する', () => {
    let p = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'v1', info: videoInfo(1, 600) },
    ])
    // 見える長さ 150 なので上限は 450
    p = setTrimStart(p, 'v1', 100)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(100)
    p = setTrimStart(p, 'v1', 1000)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(450)
    p = setTrimStart(p, 'v1', -10)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(0)
  })

  it('クロスフェードで見える長さが延びると、上限も縮む', () => {
    let p = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'v1', info: videoInfo(1, 300) },
    ])
    p = setTrimStart(p, 'v1', 150) // 上限ちょうど（300 − 150）
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(150)
    // 30 フレームのクロスフェードで動画は 15 フレーム早く見え始める → 見える長さ 165、上限 135
    p = setTransition(p, 'p1', { type: 'crossfade', durationFrames: 30 })
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(135)
  })

  it('尺を伸ばして元動画より長くなったら、開始位置は 0 に戻る', () => {
    let p = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'v1', info: videoInfo(1, 200) },
    ])
    p = setTrimStart(p, 'v1', 50)
    p = setItemDuration(p, 'v1', 250)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(0)
  })

  it('写真や無い ID、同じ値への setTrimStart は元のまま', () => {
    const p = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'v1', info: videoInfo(1, 600) },
    ])
    expect(setTrimStart(p, 'p1', 10)).toBe(p)
    expect(setTrimStart(p, 'nope', 10)).toBe(p)
    expect(setTrimStart(p, 'v1', 0)).toBe(p)
  })
})
