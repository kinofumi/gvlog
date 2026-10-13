/** 0〜1 の範囲に丸める。進行度や不透明度など「比率」を扱う関数で使う */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
