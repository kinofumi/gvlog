import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary はリンクと同じ青地に白文字、secondary は青の枠線と文字 */
  variant?: 'primary' | 'secondary'
  /** normal は本文の 8 割の幅で中央寄せ（見出しの帯より狭く見せる）、small は再生・停止のような横並びの小さいボタン */
  size?: 'normal' | 'small'
}

/** 押しやすい高さは保ちつつ、小さめの文字のボタン */
export function Button({ variant = 'primary', size = 'normal', className = '', ...rest }: Props) {
  const look =
    variant === 'primary'
      ? 'bg-blue-700 text-white disabled:bg-stone-400'
      : 'border border-blue-700 text-blue-700 disabled:border-stone-400 disabled:text-stone-400'
  const width = size === 'normal' ? 'block w-4/5 mx-auto' : 'w-24'
  return (
    <button
      className={`${width} min-h-10 rounded px-4 py-2 text-sm ${look} ${className}`}
      {...rest}
    />
  )
}
