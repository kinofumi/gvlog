import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET } from '../model/defaults'
import type { PhotoInfo, PhotoItem, Project, VideoInfo, VideoItem } from '../model/types'
import { checkTimeline } from '../timeline/compile'
import {
  addItems,
  addPhoto,
  createProject,
  moveItem,
  outputFramesOf,
  removeItem,
  setCaption,
  setItemDuration,
  setKenBurns,
  setMeta,
  setTransition,
  setTrimEnd,
  setTrimStart,
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

const empty = () => createProject(DEFAULT_PRESET, { memberName: '', spot: '' })

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

describe('addPhoto / addItems（末尾に追加。新しい素材の尺は上限までの残りを均等に割る。既存の尺は変えない）', () => {
  it('まとめて 3 枚入れると 15 秒を 3 等分、1 枚ずつ足すと残りが無いので 1 秒ずつ', () => {
    const three = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'p2', info: photoInfo(2) },
      { itemId: 'p3', info: photoInfo(3) },
    ])
    expect(durations(three)).toEqual([150, 150, 150])
    expect(durations(withPhotos(1))).toEqual([450])
    expect(durations(withPhotos(3))).toEqual([450, 30, 30])
  })

  it('途中で尺を変えても、あとから足した素材は残りを使うだけで既存の尺は動かない', () => {
    let p = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'p2', info: photoInfo(2) },
    ])
    expect(durations(p)).toEqual([225, 225])
    p = setItemDuration(p, 'p1', 90)
    p = addPhoto(p, 'p3', photoInfo(3)) // 残り 450 − 315 = 135
    expect(durations(p)).toEqual([90, 225, 135])
  })

  it('追加した写真は Ken Burns が none、キャプション無し、cut でつなぐ', () => {
    const item = withPhotos(1).items[0] as PhotoItem
    expect(item.kind).toBe('photo')
    expect(item.kenBurns.presetId).toBe('none')
    expect(item.caption).toBeUndefined()
    expect(item.transitionOut).toEqual({ type: 'cut', durationFrames: 0 })
  })

  it('個数の上限（15 秒なら 15 個）を超えたら追加せず元のまま', () => {
    const full = withPhotos(15)
    expect(addPhoto(full, 'p16', photoInfo(16))).toBe(full)
  })

  it('同じ ID の再追加は拒否して元のまま。まとめて追加でも上限超えと重複は飛ばす', () => {
    const p = withPhotos(1)
    expect(addPhoto(p, 'p1', photoInfo(1))).toBe(p)
    const fourteen = withPhotos(14)
    const added = addItems(fourteen, [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'p15', info: photoInfo(15) },
      { itemId: 'p16', info: photoInfo(16) },
    ])
    expect(added.items).toHaveLength(15)
    expect(added.items[14].itemId).toBe('p15')
  })

  it('追加後も尺の規則を満たす', () => {
    const p = withPhotos(7)
    expect(checkTimeline(p.items)).toEqual([])
  })
})

describe('removeItem', () => {
  it('削除しても残りの尺は変わらない', () => {
    const p = removeItem(withPhotos(3), 'p2')
    expect(p.items.map((i) => i.itemId)).toEqual(['p1', 'p3'])
    expect(durations(p)).toEqual([450, 30])
  })

  it('無い ID なら元のまま', () => {
    const p = withPhotos(2)
    expect(removeItem(p, 'nope')).toBe(p)
  })
})

describe('moveItem（並べ替え。尺は素材についていく）', () => {
  it('前へ・後ろへ動かせる', () => {
    const p = setItemDuration(withPhotos(3), 'p1', 150)
    expect(durations(p)).toEqual([150, 30, 30])
    const moved = moveItem(p, 'p1', 2)
    expect(moved.items.map((i) => i.itemId)).toEqual(['p2', 'p3', 'p1'])
    expect(durations(moved)).toEqual([30, 30, 150])
  })

  it('範囲外の位置や無い ID、同じ位置への移動なら元のまま', () => {
    const p = withPhotos(2)
    expect(moveItem(p, 'p1', 5)).toBe(p)
    expect(moveItem(p, 'nope', 0)).toBe(p)
    expect(moveItem(p, 'p1', 0)).toBe(p)
  })
})

describe('setItemDuration（尺の調整。他の素材は動かない）', () => {
  it('指定した素材だけ変わる。合計が上限を超えても他の素材は動かず、出力の長さは上限で止まる', () => {
    let p = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'p2', info: photoInfo(2) },
      { itemId: 'p3', info: photoInfo(3) },
    ])
    p = setItemDuration(p, 'p2', 300)
    expect(durations(p)).toEqual([150, 300, 150])
    expect(outputFramesOf(p)).toBe(450)
    p = setItemDuration(p, 'p2', 60)
    expect(durations(p)).toEqual([150, 60, 150])
    expect(outputFramesOf(p)).toBe(360)
  })

  it('最小尺未満は最小尺、上限超えは上限に止め、非整数は切り捨てる', () => {
    const p = withPhotos(2)
    expect(durations(setItemDuration(p, 'p2', 5))).toEqual([450, 30])
    expect(durations(setItemDuration(p, 'p2', 9999))).toEqual([450, 450])
    expect(durations(setItemDuration(p, 'p2', 100.9))).toEqual([450, 100])
  })

  it('素材が 1 つでも変えられる', () => {
    expect(durations(setItemDuration(withPhotos(1), 'p1', 100))).toEqual([100])
  })

  it('変えたあとはトランジションとキャプションが切り詰められる', () => {
    let p = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'p2', info: photoInfo(2) },
    ])
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
    expect(checkTimeline(p.items)).toEqual([])
  })

  it('同じ値、数でない値、無い ID なら元のまま', () => {
    const p = withPhotos(1)
    expect(setItemDuration(p, 'p1', 450)).toBe(p)
    expect(setItemDuration(p, 'p1', Number.NaN)).toBe(p)
    expect(setItemDuration(p, 'nope', 100)).toBe(p)
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

  it('トランジションは上限（前後の短い方の尺の半分）に切り詰めて保存する', () => {
    const two = addItems(empty(), [
      { itemId: 'p1', info: photoInfo(1) },
      { itemId: 'p2', info: photoInfo(2) },
    ]) // 225 と 225
    const p = setTransition(two, 'p1', { type: 'crossfade', durationFrames: 500 })
    expect(p.items[0].transitionOut).toEqual({ type: 'crossfade', durationFrames: 112 })
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

/** 写真 1 枚と動画 1 本（元動画の尺を指定）。尺は 225 ずつ */
const photoAndVideo = (sourceDurationFrames: number) =>
  addItems(empty(), [
    { itemId: 'p1', info: photoInfo(1) },
    { itemId: 'v1', info: videoInfo(1, sourceDurationFrames) },
  ])

describe('動画の追加と開始位置（トリム）', () => {
  it('写真と動画をまとめて追加できる。動画は開始位置 0、元動画の尺を持つ', () => {
    const p = photoAndVideo(600)
    expect(p.items.map((i) => i.kind)).toEqual(['photo', 'video'])
    const video = p.items[1] as VideoItem
    expect(video.trimStartFrames).toBe(0)
    expect(video.sourceDurationFrames).toBe(600)
    expect(video.transitionOut).toEqual({ type: 'cut', durationFrames: 0 })
    expect(durations(p)).toEqual([225, 225])
  })

  it('開始位置は 0〜（元動画の尺 − 見える長さ）に収めて保存する', () => {
    let p = photoAndVideo(600)
    // 見える長さ 225 なので上限は 375
    p = setTrimStart(p, 'v1', 100)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(100)
    p = setTrimStart(p, 'v1', 1000)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(375)
    p = setTrimStart(p, 'v1', -10)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(0)
  })

  it('クロスフェードで見える長さが延びると、上限も縮む', () => {
    let p = photoAndVideo(400)
    p = setTrimStart(p, 'v1', 175) // 上限ちょうど（400 − 225）
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(175)
    // 30 フレームのクロスフェードで動画は 15 フレーム早く見え始める → 見える長さ 240、上限 160
    p = setTransition(p, 'p1', { type: 'crossfade', durationFrames: 30 })
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(160)
  })

  it('尺を伸ばして元動画より長くなったら、開始位置は 0 に戻る', () => {
    let p = photoAndVideo(300)
    p = setTrimStart(p, 'v1', 50)
    p = setItemDuration(p, 'v1', 300)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(0)
  })

  it('写真や無い ID、同じ値への setTrimStart は元のまま', () => {
    const p = photoAndVideo(600)
    expect(setTrimStart(p, 'p1', 10)).toBe(p)
    expect(setTrimStart(p, 'nope', 10)).toBe(p)
    expect(setTrimStart(p, 'v1', 0)).toBe(p)
  })
})

describe('setTrimEnd（動画の終了位置。尺 = 終了位置 − 開始位置 に変わる。他の素材は動かない）', () => {
  it('終了位置を決めると、その動画の尺だけが変わる', () => {
    let p = photoAndVideo(600)
    p = setTrimStart(p, 'v1', 90)
    p = setTrimEnd(p, 'v1', 300)
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(90)
    expect(durations(p)).toEqual([225, 210])
  })

  it('尺の規則（最小尺、上限）で収まらない終了位置は、収まる値に止まる', () => {
    let p = photoAndVideo(600)
    p = setTrimEnd(p, 'v1', 5) // 最小尺 30 まで
    expect(durations(p)).toEqual([225, 30])
    p = setTrimEnd(p, 'v1', 1000) // 尺の上限 450 まで（合計は 15 秒を超えるが、他の素材は動かない）
    expect(durations(p)).toEqual([225, 450])
  })

  it('元動画の末尾を超える終了位置は末尾に止め、開始位置は動かない（レビュー: Codex 3 / Claude 2）', () => {
    let p = photoAndVideo(700)
    p = setTrimStart(p, 'v1', 400) // 尺 225、見える長さ 225 → 上限 475 の内側
    p = setTrimEnd(p, 'v1', 900) // 末尾 700 まで → 尺 300
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(400)
    expect(durations(p)).toEqual([225, 300])
  })

  it('クロスフェードで見える長さが延びる分は終了位置の上限から引き、開始位置は動かない', () => {
    let p = photoAndVideo(500)
    p = setTransition(p, 'p1', { type: 'crossfade', durationFrames: 30 }) // 動画は 15 フレーム早く見え始める
    p = setTrimStart(p, 'v1', 100)
    p = setTrimEnd(p, 'v1', 500) // 上限は 500 − 15 = 485 → 尺 385
    expect((p.items[1] as VideoItem).trimStartFrames).toBe(100)
    expect(durations(p)).toEqual([225, 385])
  })

  it('素材が 1 つでも終了位置で尺を変えられる', () => {
    const single = addItems(empty(), [{ itemId: 'v1', info: videoInfo(1, 600) }])
    expect(durations(setTrimEnd(single, 'v1', 100))).toEqual([100])
  })

  it('写真、無い ID、同じ終了位置、数でない値は元のまま', () => {
    const p = photoAndVideo(600)
    expect(setTrimEnd(p, 'p1', 100)).toBe(p)
    expect(setTrimEnd(p, 'nope', 100)).toBe(p)
    expect(setTrimEnd(p, 'v1', 225)).toBe(p)
    expect(setTrimEnd(p, 'v1', Number.NaN)).toBe(p)
  })
})
