import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  children: ReactNode
}

/** 画面の区切り。見出しは黒地に白抜きの 1 行（目立つように）で、中身はその下に縦に並ぶ */
export function Section({ title, children }: Props) {
  return (
    <section className="space-y-2">
      <h2 className="rounded px-3 py-1 text-sm font-bold text-white bg-stone-900">{title}</h2>
      {children}
    </section>
  )
}
