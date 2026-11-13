import type { ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
}

/**
 * 別タブで開く外部リンク（Google マップなど）。指で押せる高さ（min-h-11 = 44px）を確保し、本文と同じ小さめの文字で青い下線。
 * 栞とおすすめの両方で同じ見た目を使うので、ここに 1 つだけ書く（CLAUDE.md: 同じクラスの組み合わせを 3 回以上書いたら切り出す）。
 */
export function ExternalLink({ href, children }: Props) {
  return (
    <a
      className="inline-block min-h-11 py-2 text-sm text-blue-700 underline"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  )
}
