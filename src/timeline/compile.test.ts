import { describe, expect, it } from 'vitest'
import { checkTimeline, compileTimeline, itemsAt, transitionAt } from './compile'

describe('compileTimeline（トランジション込みの区間）', () => {
  it('cut だけなら見える区間はコア区間と同じ', () => {
    const compiled = compileTimeline([
      { itemId: 'a', durationFrames: 150, transitionOut: { type: 'cut', durationFrames: 0 } },
      { itemId: 'b', durationFrames: 150 },
    ])
    expect(compiled).toEqual([
      {
        itemId: 'a',
        coreStart: 0,
        coreEnd: 150,
        visibleStart: 0,
        visibleEnd: 150,
        transitionOut: null,
      },
      {
        itemId: 'b',
        coreStart: 150,
        coreEnd: 300,
        visibleStart: 150,
        visibleEnd: 300,
        transitionOut: null,
      },
    ])
  })

  it('crossfade 10 フレーム: 前は 5 フレーム長く見え、後は 5 フレーム早く見え始める', () => {
    const compiled = compileTimeline([
      {
        itemId: 'a',
        durationFrames: 150,
        transitionOut: { type: 'crossfade', durationFrames: 10 },
      },
      { itemId: 'b', durationFrames: 150 },
    ])
    expect(compiled[0]).toEqual({
      itemId: 'a',
      coreStart: 0,
      coreEnd: 150,
      visibleStart: 0,
      visibleEnd: 155,
      transitionOut: { type: 'crossfade', start: 145, end: 155 },
    })
    expect(compiled[1]).toMatchObject({
      coreStart: 150,
      coreEnd: 300,
      visibleStart: 145,
      visibleEnd: 300,
    })
  })

  it('奇数のトランジション長は、前に ceil、後に floor を割り当てる', () => {
    const compiled = compileTimeline([
      { itemId: 'a', durationFrames: 150, transitionOut: { type: 'crossfade', durationFrames: 9 } },
      { itemId: 'b', durationFrames: 150 },
    ])
    expect(compiled[0].visibleEnd).toBe(155)
    expect(compiled[0].transitionOut).toEqual({ type: 'crossfade', start: 146, end: 155 })
    expect(compiled[1].visibleStart).toBe(146)
  })

  it('末尾の素材の transitionOut は無視する', () => {
    const compiled = compileTimeline([
      {
        itemId: 'a',
        durationFrames: 300,
        transitionOut: { type: 'crossfade', durationFrames: 10 },
      },
    ])
    expect(compiled[0]).toMatchObject({ visibleEnd: 300, transitionOut: null })
  })

  it('長すぎるトランジションは、前後の短い方の尺の半分に切り詰める', () => {
    const compiled = compileTimeline([
      {
        itemId: 'a',
        durationFrames: 60,
        transitionOut: { type: 'crossfade', durationFrames: 100 },
      },
      { itemId: 'b', durationFrames: 240 },
    ])
    expect(compiled[0].transitionOut).toEqual({ type: 'crossfade', start: 45, end: 75 })
  })

  it('素材が 0 のときは空', () => {
    expect(compileTimeline([])).toEqual([])
  })
})

describe('itemsAt / transitionAt（そのフレームで見える素材と進行度）', () => {
  const compiled = compileTimeline([
    { itemId: 'a', durationFrames: 150, transitionOut: { type: 'crossfade', durationFrames: 10 } },
    { itemId: 'b', durationFrames: 150 },
  ])

  it('トランジションの外では 1 つだけ見える', () => {
    expect(itemsAt(compiled, 0).map((c) => c.itemId)).toEqual(['a'])
    expect(itemsAt(compiled, 200).map((c) => c.itemId)).toEqual(['b'])
    expect(transitionAt(compiled, 200)).toBeNull()
  })

  it('トランジションの中では前後の 2 つが順に見える', () => {
    expect(itemsAt(compiled, 145).map((c) => c.itemId)).toEqual(['a', 'b'])
    expect(itemsAt(compiled, 154).map((c) => c.itemId)).toEqual(['a', 'b'])
  })

  it('進行度は区間の始まりで 0、半分で 0.5、終わりの直前で 0.9', () => {
    expect(transitionAt(compiled, 145)).toEqual({ type: 'crossfade', progress: 0 })
    expect(transitionAt(compiled, 150)).toEqual({ type: 'crossfade', progress: 0.5 })
    expect(transitionAt(compiled, 154)).toEqual({ type: 'crossfade', progress: 0.9 })
    expect(transitionAt(compiled, 155)).toBeNull()
  })

  it('範囲外のフレームでは何も見えない', () => {
    expect(itemsAt(compiled, 300)).toEqual([])
    expect(itemsAt(compiled, -1)).toEqual([])
  })
})

describe('checkTimeline（タイムライン全体の不変条件）', () => {
  it('問題がなければ空', () => {
    expect(
      checkTimeline(
        [
          { itemId: 'a', durationFrames: 150 },
          { itemId: 'b', durationFrames: 150 },
        ],
        300,
      ),
    ).toEqual([])
  })

  it('itemId が重複していればエラー', () => {
    expect(
      checkTimeline(
        [
          { itemId: 'a', durationFrames: 150 },
          { itemId: 'a', durationFrames: 150 },
        ],
        300,
      ),
    ).toContain('素材 ID「a」が重複しています。')
  })

  it('尺の問題（合計不一致、最小尺未満）も含める', () => {
    const errors = checkTimeline(
      [
        { itemId: 'a', durationFrames: 10 },
        { itemId: 'b', durationFrames: 150 },
      ],
      300,
    )
    expect(errors).toContain('尺の合計（160）が総尺（300）と一致しません。')
    expect(errors).toContain('素材 1 の尺（10）が最小尺（30）未満です。')
  })

  it('トランジションが長すぎる、キャプションの表示区間が足りない、もエラーにする（compile は黙って切り詰めるため）', () => {
    const errors = checkTimeline(
      [
        {
          itemId: 'a',
          durationFrames: 60,
          transitionOut: { type: 'crossfade', durationFrames: 100 },
          caption: { inOffsetFrames: 50, outOffsetFrames: 50 },
        },
        { itemId: 'b', durationFrames: 240 },
      ],
      300,
    )
    expect(errors).toContain('素材 1 のトランジション（100）が上限（30）を超えています。')
    expect(errors).toContain('素材 1 のキャプションの表示区間が足りません（16 フレーム以上必要）。')
  })
})
