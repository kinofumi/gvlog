# 付録 Python と TypeScript の対照表

> このアプリに出てくる書き方だけ。分からない用語が出たら、ここに 1 行足す。

## 値と型

| Python                            | TypeScript                                  | 備考                                            |
| --------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| `int`、`float`                    | `number`                                    | 区別なし。`7 / 2` は `3.5`。整数は `Math.floor` |
| `str`                             | `string`                                    |                                                 |
| `bool`                            | `boolean`                                   |                                                 |
| `None`                            | `undefined`（未設定）／`null`（意図して空） | 2 つある                                        |
| `list[int]`                       | `number[]`                                  |                                                 |
| `dict[str, V]`                    | `Record<string, V>`                         |                                                 |
| `set[str]`                        | `Set<string>`                               | `.has()`、`.add()`                              |
| `tuple[int, int]`                 | `[number, number]`                          |                                                 |
| `Any`                             | `unknown`                                   | `unknown` は確かめるまで何もできない            |
| `Literal['a', 'b']`               | `'a' \| 'b'`                                |                                                 |
| `Optional[T]`                     | `T \| undefined`、フィールドなら `name?: T` |                                                 |
| `Union[A, B]`                     | `A \| B`                                    |                                                 |
| `@dataclass class P:`             | `type P = { ... }`                          | クラスではない。`{ ... }` で作る                |
| `class B(A):`（フィールドの合体） | `type B = A & { ... }`                      |                                                 |
| `Protocol`                        | （何も書かない）                            | 形が合えば通る（構造的な型）                    |
| `TypeVar('T', bound=A)`           | `<T extends A>`                             | 最小限にする                                    |
| `isinstance(x, Video)`            | `x.kind === 'video'`                        | フィールドの値で見分ける                        |
| `match x: case ...`               | `if (x.kind === ...)`、`switch`             |                                                 |
| `x: int = cast(int, y)`           | `y as number`                               | 確かめた直後にだけ                              |
| `Final`／定数                     | `as const`                                  |                                                 |

## 文法

| Python                                 | TypeScript                                                        | 備考                              |
| -------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| `x = 1`（再代入する）                  | `let x = 1`                                                       |                                   |
| `x = 1`（再代入しない）                | `const x = 1`                                                     | 中身は変えられる                  |
| `def f(x: int) -> int:`                | `function f(x: number): number {`                                 |                                   |
| `lambda x: x + 1`                      | `(x) => x + 1`                                                    |                                   |
| `def f(x, y=10):`                      | `function f(x: number, y = 10)`                                   |                                   |
| `def f(**kwargs):`                     | `function f({ a, b, ...rest }: Props)`                            | 分割代入と `...rest`              |
| `f"{a} と {b}"`                        | `` `${a} と {b}` ``                                               | バッククォート                    |
| `x if c else y`                        | `c ? x : y`                                                       |                                   |
| `a or b`                               | `a ?? b`（`null`/`undefined` のときだけ）、`a \|\| b`（偽のとき） | `0` や `''` には `??`             |
| `a and b`                              | `a && b`                                                          | JSX では「a のときだけ b を出す」 |
| `x == y`                               | `x === y`                                                         | `==` は使わない                   |
| `x is y`                               | `x === y`（オブジェクト）                                         |                                   |
| `x in d`（dict のキー）                | `'x' in d`                                                        |                                   |
| `x in xs`（list）                      | `xs.includes(x)`                                                  |                                   |
| `getattr(x, 'a', None)`                | `x?.a`                                                            |                                   |
| `for x in xs:`                         | `for (const x of xs) {`                                           |                                   |
| `for i, x in enumerate(xs):`           | `xs.forEach((x, i) => ...)`                                       | 要素が先、添字が後                |
| `for i in range(n):`                   | `for (let i = 0; i < n; i++) {`                                   |                                   |
| `while c:`                             | `while (c) {`                                                     |                                   |
| `try: ... except E as e: ... finally:` | `try { } catch (e) { } finally { }`                               | `e` の型は `unknown`              |
| `raise ValueError('...')`              | `throw new Error('...')`                                          |                                   |
| `pass`                                 | `{}`                                                              |                                   |
| `from m import f`                      | `import { f } from './m'`                                         | 相対パス、拡張子なし              |
| `from m import T`（型だけ）            | `import type { T } from './m'`                                    |                                   |
| 先頭 `_` で非公開                      | `export` を付けない                                               |                                   |
| `# コメント`                           | `// コメント`                                                     |                                   |
| `"""docstring"""`                      | `/** JSDoc */`（関数の上）                                        | エディタがホバーで表示する        |
| `print(x)`                             | `console.log(x)`                                                  |                                   |

## 配列・辞書・文字列

| Python                                | TypeScript                                 | 備考                        |
| ------------------------------------- | ------------------------------------------ | --------------------------- |
| `[f(x) for x in xs]`                  | `xs.map((x) => f(x))`                      |                             |
| `[x for x in xs if p(x)]`             | `xs.filter((x) => p(x))`                   |                             |
| `any(p(x) for x in xs)`               | `xs.some((x) => p(x))`                     |                             |
| `all(p(x) for x in xs)`               | `xs.every((x) => p(x))`                    |                             |
| `next((x for x in xs if p(x)), None)` | `xs.find((x) => p(x))`                     | 無ければ `undefined`        |
| `sum(xs)`                             | `xs.reduce((s, x) => s + x, 0)`            |                             |
| `functools.reduce(f, xs, init)`       | `xs.reduce(f, init)`                       |                             |
| `len(xs)`                             | `xs.length`                                |                             |
| `xs[1:3]`                             | `xs.slice(1, 3)`                           |                             |
| `xs[-1]`                              | `xs[xs.length - 1]`、`xs.at(-1)`           |                             |
| `xs + [y]`                            | `[...xs, y]`                               | 新しい配列                  |
| `xs.append(y)`                        | `xs.push(y)`                               | 書き換える                  |
| `{**d, 'k': v}`                       | `{ ...d, k: v }`                           | 新しいオブジェクト（浅い）  |
| `dataclasses.replace(x, k=v)`         | `{ ...x, k: v }`                           |                             |
| `d.get('k')`                          | `d['k']`、`d.k`                            | 無ければ `undefined`        |
| `d.items()`                           | `Object.entries(d)`                        |                             |
| `d.keys()`／`d.values()`              | `Object.keys(d)`／`Object.values(d)`       |                             |
| `s.strip()`                           | `s.trim()`                                 |                             |
| `s.split(':')`                        | `s.split(':')`                             |                             |
| `':'.join(xs)`                        | `xs.join(':')`                             |                             |
| `s.zfill(2)`                          | `s.padStart(2, '0')`                       |                             |
| `s.replace(a, b)`（全部）             | `s.replace(/a/g, b)`、`s.replaceAll(a, b)` | `replace` は最初の 1 つだけ |
| `'あ' * 3`                            | `'あ'.repeat(3)`                           |                             |
| `str(n)`                              | `String(n)`、`` `${n}` ``                  |                             |
| `int(s)`／`float(s)`                  | `Number(s)`                                | 失敗すると `NaN`            |
| `round(x, 1)`                         | `x.toFixed(1)`（文字列になる）             |                             |
| `math.floor`／`ceil`                  | `Math.floor`／`Math.ceil`                  |                             |
| `min(a, b)`／`max(a, b)`              | `Math.min(a, b)`／`Math.max(a, b)`         |                             |
| `math.isfinite(x)`                    | `Number.isFinite(x)`                       |                             |
| `isinstance(x, int)`（整数か）        | `Number.isInteger(x)`                      |                             |

## 非同期

| asyncio                  | JavaScript                                  |
| ------------------------ | ------------------------------------------- |
| `async def` / `await`    | `async function` / `await`                  |
| `asyncio.Future`         | `Promise`                                   |
| `asyncio.sleep(1)`       | `new Promise((r) => setTimeout(r, 1000))`   |
| `asyncio.gather(a, b)`   | `Promise.all([a, b])`                       |
| `asyncio.wait_for(c, t)` | 自作（`src/export/withTimeout.ts`）         |
| `task.cancel()`          | `AbortController` / `AbortSignal`（協力的） |

## テスト

| pytest                            | vitest                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| `class TestX:`                    | `describe('X', () => { ... })`                                |
| `def test_y():`                   | `it('y', () => { ... })`                                      |
| `assert a == b`（値）             | `expect(a).toBe(b)`                                           |
| `assert a == b`（配列・辞書）     | `expect(a).toEqual(b)`                                        |
| `assert a is b`                   | `expect(a).toBe(b)`                                           |
| `assert x in xs`                  | `expect(xs).toContain(x)`                                     |
| `assert x is None`                | `expect(x).toBeNull()` / `.toBeUndefined()`                   |
| `assert len(xs) == 3`             | `expect(xs).toHaveLength(3)`                                  |
| `with pytest.raises(E, match=m):` | `expect(() => f()).toThrow(m)`                                |
| `await` のテスト                  | `it('...', async () => { await expect(p).resolves.toBe(v) })` |
| 失敗する `await`                  | `await expect(p).rejects.toThrow(m)`                          |
| `freezegun`                       | `vi.useFakeTimers()` / `vi.advanceTimersByTime()`             |
| `unittest.mock.patch`             | `vi.spyOn(obj, 'method')`                                     |
| `pytest`                          | `npm test`                                                    |
| `pytest path/to/test.py`          | `npx vitest run src/path/to/x.test.ts`                        |
| `pytest-watch`                    | `npm run test:watch`                                          |

## 道具

| Python                     | このリポジトリ                 |
| -------------------------- | ------------------------------ |
| `pip` / `requirements.txt` | `npm` / `package.json`         |
| `pip install -r`           | `npm ci`                       |
| `venv`                     | `node_modules/`                |
| `mypy`                     | `tsc`（`npm run typecheck`）   |
| `ruff check`               | `oxlint`（`npm run lint`）     |
| `ruff format` / `black`    | `prettier`（`npm run format`） |
| `pytest`                   | `vitest`（`npm test`）         |
| `python -m http.server`    | `vite`（`npm run dev`）        |
