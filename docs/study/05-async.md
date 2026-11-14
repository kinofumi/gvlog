# 第 5 章 非同期

> 題材: `src/export/withTimeout.ts` とそのテスト
> 目標: `Promise` と `async`/`await` を asyncio に対応づけて読める。中断（AbortSignal）の仕組みが分かる。

## ブラウザは 1 本のスレッド

JavaScript は基本的に 1 本のスレッドで動き、待ち時間（ファイル読み込み、動画のデコード、タイマー）はイベントループに任せる。Python の `asyncio` と同じモデル。違いは、**最初から全部が非同期** であること。同期で待つ手段（`time.sleep`）が無い。

## Promise ≒ Future

| asyncio                           | JavaScript                                |
| --------------------------------- | ----------------------------------------- |
| `async def f():`                  | `async function f() {`                    |
| `await g()`                       | `await g()`                               |
| `asyncio.Future`                  | `Promise`                                 |
| `future.set_result(v)`            | `resolve(v)`                              |
| `future.set_exception(e)`         | `reject(e)`                               |
| `asyncio.wait_for(coro, timeout)` | 自作（`withTimeout`）                     |
| `task.cancel()`                   | `AbortController.abort()`（協力的な中断） |
| `asyncio.sleep(1)`                | `new Promise((r) => setTimeout(r, 1000))` |
| `asyncio.gather(a, b)`            | `Promise.all([a, b])`                     |

`async function` は呼ぶと必ず `Promise` を返す。`await` は `Promise` が終わるまで、その関数の続きを後回しにする。Python と同じ。

## `new Promise` で手作りする

`withTimeout.ts` は `async` ではなく `new Promise` で書いてある。

```ts
export function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    ...
  })
}
```

`new Promise((resolve, reject) => { ... })` は「結果を後で入れる箱」を作る。`resolve(v)` を呼ぶと成功、`reject(e)` で失敗。箱の中で 3 つの出口を待っている。

1. 元の `promise` が終わる → その結果をそのまま流す。
2. `ms` ミリ秒たつ → タイムアウトのエラー。
3. `signal` が中断される → 「中断されました」のエラー。

```ts
promise.then(
  (value) => finish(() => resolve(value)),
  (error) => finish(() => reject(error)),
)
```

`.then(成功時, 失敗時)` は `await` を使わない書き方。`async` にすると「元の promise が失敗したあともタイマーを片付ける」が書きにくいので、ここでは `.then` を選んでいる。

## 「1 回だけ終わる」を守る

```ts
let settled = false
function finish(settle: () => void) {
  if (settled) return
  settled = true
  clearTimeout(timer)
  signal?.removeEventListener('abort', onAbort)
  settle()
}
```

3 つの出口のどれが先に来ても、`finish` を通して **1 回だけ** 結果を入れ、タイマーとイベントの登録を片付ける。`Promise` は 2 回目の `resolve` を黙って無視するが、タイマーの片付けは自分でやらないと残る。

Python で `asyncio.wait_for` を自作するときの `done` フラグと同じ。

## AbortSignal: 協力的な中断

```ts
if (signal?.aborted) {
  onAbort()
} else {
  signal?.addEventListener('abort', onAbort)
}
```

`AbortController` を作った側が `controller.abort()` を呼ぶと、`signal` に `'abort'` イベントが飛ぶ。受ける側はそれを聞いて自分で止まる。Python の `task.cancel()` が `CancelledError` を投げ込むのに対し、こちらは「お願い」なので、聞いていない処理は止まらない。

「すでに中断済みの signal を渡されたら、イベントは来ない」ので先に `aborted` を見る。テストの最後の `it` がこの場合を確かめている。

## 非同期のテスト

```ts
it('期限内に終われば値をそのまま返す', async () => {
  await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42)
})

it('元の Promise が失敗したらその失敗をそのまま返す', async () => {
  await expect(withTimeout(Promise.reject(new Error('元の失敗')), 1000)).rejects.toThrow('元の失敗')
})
```

- `it` の関数を `async` にし、`await expect(...)` と書く。
- `.resolves.toBe(v)` は成功を、`.rejects.toThrow('...')` は失敗とそのメッセージを確かめる。pytest の `await` と `pytest.raises` に当たる。

```ts
vi.useFakeTimers()
try {
  const result = withTimeout(never, 4000)
  vi.advanceTimersByTime(4000)
  await expect(result).rejects.toThrow('固まった可能性')
} finally {
  vi.useRealTimers()
}
```

本当に 4 秒待たず、偽のタイマーで時間を進める。`try` / `finally` で必ず本物に戻す。Python の `freezegun` や `asyncio` の `loop.time` 差し替えに相当する。

## このアプリでどこに使っているか

書き出し（`src/export/`）は WebCodecs と mediabunny の非同期 API を `await` でつないでいる。1 フレームのエンコードが固まったときに全体が止まらないよう、`withTimeout` で包んでいる。「中断」は書き出しの「やめる」ボタンにつながっている。読むのは 9 章以降でよい。

## やってみる

### 演習 5-1 `sleep` を書く

`src/export/sleep.ts` に `sleep(ms): Promise<void>` を書く。先にテスト:

```ts
it('指定した時間のあとに終わる', async () => {
  const start = Date.now()
  await sleep(20)
  expect(Date.now() - start).toBeGreaterThanOrEqual(15)
})
```

（15 にしているのはタイマーの誤差のため。）

### 演習 5-2 `withTimeout` で包む

5-1 の `sleep(100)` を `withTimeout(sleep(100), 10)` で包むと何が起きるか予想し、テストに足す。

### 演習 5-3 読む

`withTimeout.ts` から `if (settled) return` を消すと、どのテストが落ちるか予想する。実際に消して `npm test`、戻す。

## 答え合わせ

- 5-1:
  ```ts
  /** ms ミリ秒待つ */
  export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
  ```
- 5-2: `await expect(withTimeout(sleep(100), 10)).rejects.toThrow('固まった可能性')`。
- 5-3: 落ちるテストは無い（`Promise` が 2 回目の `resolve`/`reject` を無視するため）。ただし `clearTimeout` や `removeEventListener` が 2 回呼ばれるようになり、片付けの意図が崩れる。テストが通ることと設計が正しいことは別、という例。

## この章のまとめ

- `Promise` は Future、`async`/`await` は同じ。全部が非同期。
- `new Promise((resolve, reject) => ...)` は箱を手作りするとき。出口が複数あるなら「1 回だけ終わる」を自分で守る。
- 中断は `AbortSignal` を聞いて自分で止まる。
- 非同期のテストは `async () => { await expect(...).resolves / .rejects }`。
