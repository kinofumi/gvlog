import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary はリンクと同じ青地に白文字、secondary は青の枠線と文字 */
  variant?: 'primary' | 'secondary'
}

/** 画面幅いっぱいのボタン（スマホで押しやすい高さは保ちつつ、小さめの文字） */
export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const look =
    variant === 'primary'
      ? 'bg-blue-700 text-white disabled:bg-stone-400'
      : 'border border-blue-700 text-blue-700 disabled:border-stone-400 disabled:text-stone-400'
  return (
    <button
      className={`min-h-10 w-full rounded px-4 py-2 text-sm ${look} ${className}`}
      {...rest}
    />
  )
}
