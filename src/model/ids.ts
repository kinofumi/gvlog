/**
 * プロジェクトや素材の ID を作る。
 * crypto.randomUUID は HTTPS か localhost でしか使えない（LAN の http で開くと undefined）ので、
 * 無いときは乱数で代用する。衝突の心配は 1 端末内の数十件なので実用上ない。
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
