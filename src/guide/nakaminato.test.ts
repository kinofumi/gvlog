import { describe, expect, it } from 'vitest'
import { NAKAMINATO } from './nakaminato'

/** 「HH:MM」を分に直す（並び順の比較用） */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

describe('NAKAMINATO（チラシから書き写した栞のデータ）', () => {
  it('時刻のある行は、当日の流れの順（早い時刻から）に並んでいる', () => {
    const times = NAKAMINATO.stops.filter((stop) => stop.time !== '').map((stop) => stop.time)
    expect(times.length).toBeGreaterThan(0)
    for (let i = 1; i < times.length; i++) {
      expect(toMinutes(times[i])).toBeGreaterThanOrEqual(toMinutes(times[i - 1]))
    }
  })

  it('時刻は「HH:MM」の形か空（時刻が決まっていない行）', () => {
    for (const stop of NAKAMINATO.stops) {
      expect(stop.time).toMatch(/^(\d{2}:\d{2})?$/)
    }
  })

  it('会場の地図リンクは「緯度,経度」で、その地点にピンが立つ', () => {
    expect(NAKAMINATO.venue.mapQuery).toMatch(/^\d+\.\d+,\d+\.\d+$/)
  })

  it('会場の名前は「Artisan 海門」だけ（地図のピンに付いていた補足はうつさない。公開リポジトリのため）', () => {
    expect(NAKAMINATO.venue.name).toBe('Artisan 海門')
  })
})
