import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary は黒地、secondary は枠線だけ */
  variant?: 'primary' | 'secondary'
}

/** 画面幅いっぱいの大きなボタン（スマホで押しやすい高さ）。見た目の調整は M5 で行う */
export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const look =
    variant === 'primary'
      ? 'bg-stone-900 text-white disabled:bg-stone-400'
      : 'border border-stone-400 disabled:text-stone-400'
  return <button className={`w-full rounded px-4 py-3 ${look} ${className}`} {...rest} />
}
