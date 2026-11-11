import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

/**
 * 知らせるだけのポップアップ（<dialog> の showModal）。「OK」か背景の Esc で閉じる。
 * 表示する間だけ描く（親が条件付きで置く）。閉じたら onClose で親に知らせる。
 */
export function Dialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
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
