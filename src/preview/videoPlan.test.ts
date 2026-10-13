import { describe, expect, it } from 'vitest'
import { planFrame, type VideoState } from './videoPlan'

const stopped = (over: Partial<VideoState> = {}): VideoState => ({
  currentTime: 0,
  duration: 10,
  paused: true,
  seeking: false,
  ended: false,
  requested: null,
  ...over,
})

describe('planFrame（停止中）', () => {
  it('時刻が合っていれば何もしない', () => {
    expect(planFrame(stopped({ currentTime: 3 }), 3.01, false)).toEqual({
      seekTo: null,
      play: false,
      pause: false,
    })
  })

  it('時刻が違えばシークする', () => {
    expect(planFrame(stopped(), 3, false).seekTo).toBe(3)
  })

  it('シーク中は重ねて要求しない', () => {
    expect(planFrame(stopped({ seeking: true }), 3, false).seekTo).toBeNull()
  })

  it('同じ時刻を要求済みなら、ブラウザが別の位置に止めても要求し直さない（循環しない）', () => {
    // 末尾 10 秒の動画に 12 秒を要求 → 10 秒に止まる。要求済みなので再要求しない
    expect(planFrame(stopped({ currentTime: 10, requested: 10 }), 12, false).seekTo).toBeNull()
    // フレーム境界に寄せられて 0.03 秒ずれても同じ
    expect(planFrame(stopped({ currentTime: 3.03, requested: 3 }), 3, false).seekTo).toBeNull()
  })

  it('末尾を過ぎた時刻は末尾に留める（ホールド）', () => {
    expect(planFrame(stopped(), 12, false).seekTo).toBe(10)
  })

  it('読み込み前（duration が NaN）は制限せずにそのまま要求する', () => {
    expect(planFrame(stopped({ duration: Number.NaN }), 12, false).seekTo).toBe(12)
  })

  it('再生していたら止める', () => {
    expect(planFrame(stopped({ paused: false, currentTime: 3 }), 3, false).pause).toBe(true)
  })
})

describe('planFrame（再生中）', () => {
  it('止まっていれば再生し、ずれが小さければシークしない', () => {
    expect(planFrame(stopped({ currentTime: 3.05 }), 3, true)).toEqual({
      seekTo: null,
      play: true,
      pause: false,
    })
  })

  it('ずれが 0.1 秒を超えたら時刻を合わせてから再生する', () => {
    expect(planFrame(stopped({ currentTime: 1 }), 3, true)).toEqual({
      seekTo: 3,
      play: true,
      pause: false,
    })
  })

  it('末尾に達したら止めたままにする（play() で先頭に戻さない）', () => {
    expect(planFrame(stopped({ currentTime: 10, ended: true }), 10.5, true)).toEqual({
      seekTo: null,
      play: false,
      pause: false,
    })
    expect(planFrame(stopped({ currentTime: 10, paused: false }), 12, true).pause).toBe(true)
  })

  it('末尾で止まったあとに前へ戻されたら、先にシークし（再生は次の判断で始まる）', () => {
    const cmd = planFrame(stopped({ currentTime: 10, ended: true }), 2, true)
    expect(cmd.seekTo).toBe(2)
    expect(cmd.play).toBe(false)
  })
})
