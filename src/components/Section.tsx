import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  children: ReactNode
}

/**
 * 画面の区切り。見出しは黒地に白抜きの帯で、画面の幅いっぱいに広げる（ボタンより幅が広く、大きく見えるように）。
 * 区切りどうしの間は mb-12（3rem、本文の約 3 文字分）空ける。並べる側（JoinPanel、App）は space-y を使わない。
 * App の main が左右に px-4 の余白を持つので、見出しだけ -mx-4 で余白を打ち消し、同じ px-4 で文字の位置を本文とそろえる。
 */
export function Section({ title, children }: Props) {
  return (
    <section className="mb-12 space-y-2">
      <h2 className="-mx-4 px-4 py-2 text-lg font-bold text-white bg-stone-900">{title}</h2>
      {children}
    </section>
  )
}
