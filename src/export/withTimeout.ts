/**
 * 期限内に終わらなければ失敗にする。signal で中断されたときも失敗にする。
 * どの経路でも、元の Promise の結果は必ず受け取る（未処理の rejection を残さない）。
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => finish(() => reject(timeoutError(ms))), ms)
    const onAbort = () => finish(() => reject(new Error('中断されました')))

    function finish(settle: () => void) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      settle()
    }

    promise.then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error)),
    )

    if (signal?.aborted) {
      onAbort()
    } else {
      signal?.addEventListener('abort', onAbort)
    }
  })
}

function timeoutError(ms: number): Error {
  return new Error(`${ms}ms 以内に終わりませんでした（固まった可能性）`)
}
