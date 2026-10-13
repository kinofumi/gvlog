import { describe, expect, it, vi } from 'vitest'
import { withTimeout } from './withTimeout'

describe('withTimeout', () => {
  it('期限内に終われば値をそのまま返す', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42)
  })

  it('元の Promise が失敗したらその失敗をそのまま返す', async () => {
    await expect(withTimeout(Promise.reject(new Error('元の失敗')), 1000)).rejects.toThrow(
      '元の失敗',
    )
  })

  it('期限を過ぎたら「固まった可能性」のエラーになる', async () => {
    vi.useFakeTimers()
    try {
      const never = new Promise<number>(() => {})
      const result = withTimeout(never, 4000)
      vi.advanceTimersByTime(4000)
      await expect(result).rejects.toThrow('固まった可能性')
    } finally {
      vi.useRealTimers()
    }
  })

  it('signal で中断したら「中断されました」のエラーになる', async () => {
    const controller = new AbortController()
    const never = new Promise<number>(() => {})
    const result = withTimeout(never, 4000, controller.signal)
    controller.abort()
    await expect(result).rejects.toThrow('中断されました')
  })

  it('すでに中断済みの signal を渡しても、元の Promise の結果は受け取る（未処理の失敗を残さない）', async () => {
    const controller = new AbortController()
    controller.abort()
    const original = new Promise<number>(() => {})
    const thenSpy = vi.spyOn(original, 'then')
    await expect(withTimeout(original, 4000, controller.signal)).rejects.toThrow('中断されました')
    expect(thenSpy).toHaveBeenCalledTimes(1)
  })
})
