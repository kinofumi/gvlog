import { describe, expect, it } from 'vitest'
import { newId } from './ids'

describe('newId（素材やプロジェクトの ID）', () => {
  it('毎回違う、空でない文字列を返す', () => {
    const a = newId()
    const b = newId()
    expect(a).not.toBe('')
    expect(a).not.toBe(b)
  })
})
