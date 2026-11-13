type Props = {
  label: string
  /** primary は青地に白文字（▲▼削除）、secondary は青の枠線と文字（スライダーの矢印）。Button と同じ使い分け */
  variant?: 'primary' | 'secondary'
  /** 読み上げとツールチップ。label が記号（▲、◀）だけで意味が伝わらないときに付ける */
  title?: string
  disabled?: boolean
  onClick: () => void
}

/** 一覧の行に付ける小さなボタン（▲▼削除、テロップを外す、スライダーの矢印）。親の onClick には伝えない */
export function SmallButton({ label, variant = 'primary', title, disabled, onClick }: Props) {
  const look =
    variant === 'primary'
      ? 'bg-blue-700 text-white disabled:bg-stone-400'
      : 'border border-blue-700 text-blue-700 disabled:border-stone-400 disabled:text-stone-400'
  return (
    <button
      type="button"
      className={`min-h-11 min-w-11 rounded px-2 text-xs ${look}`}
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {label}
    </button>
  )
}
