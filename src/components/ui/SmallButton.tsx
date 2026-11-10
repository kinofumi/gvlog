/** 一覧の行に付ける小さなボタン（▲▼削除）。親の onClick（行の選択）には伝えない */
export function SmallButton({
  label,
  disabled,
  onClick,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className="min-h-11 min-w-11 rounded border border-stone-400 px-2 text-xs disabled:text-stone-300"
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
