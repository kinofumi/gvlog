import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  children: ReactNode
}

/** 画面の区切り。見出しは太字 1 行で、中身はその下に縦に並ぶ */
export function Section({ title, children }: Props) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  )
}
