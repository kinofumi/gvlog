import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

/**
 * 知らせるだけのポップアップ（<dialog> の showModal）。「OK」か Esc で閉じる。
 * 表示する間だけ描く（親が条件付きで置く）。閉じたら onClose で親に知らせる。
 * 片付けは持たない。要素が DOM から外れればブラウザが閉じるし、effect の片付けで close() すると close イベントで onClose が走り、
 * 開発モードの StrictMode（effect を「開く → 片付け → 開く」と二重に動かす）で自分を消してしまう。
 * 親が別の理由でこの部品を外すときは、親が自分の状態も戻すこと（ExportPanel は書き出し開始時に戻している）。
 */
export function Dialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(90vw,20rem)] rounded-lg p-5 text-stone-900 shadow-lg backdrop:bg-black/40"
    >
      <div className="space-y-4">
        <div className="text-base">{children}</div>
        <form method="dialog">
          <Button>OK</Button>
        </form>
      </div>
    </dialog>
  )
}
