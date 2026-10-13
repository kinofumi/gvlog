/** エラーを人が読める 1 行にする。TypeError や DOMException の name は原因の手がかりなので残す */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'Error' ? error.message : `${error.name}: ${error.message}`
  }
  return String(error)
}
