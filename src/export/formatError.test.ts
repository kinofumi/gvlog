import { describe, expect, it } from 'vitest'
import { formatError } from './formatError'

describe('formatError', () => {
  it('ただの Error はメッセージだけにする', () => {
    expect(formatError(new Error('出力が空でした。'))).toBe('出力が空でした。')
  })

  it('TypeError など名前のあるエラーは名前を前に付ける', () => {
    expect(formatError(new TypeError('network error'))).toBe('TypeError: network error')
  })

  it('DOMException も名前を前に付ける', () => {
    expect(formatError(new DOMException('aborted', 'AbortError'))).toBe('AbortError: aborted')
  })

  it('Error でない値は文字列にする', () => {
    expect(formatError('文字列の失敗')).toBe('文字列の失敗')
  })
})
