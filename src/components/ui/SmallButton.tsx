/** 一覧の行に付ける小さなボタン（▲▼削除、テロップを外す）。色は Button の primary と同じ青。親の onClick（行の選択）には伝えない */
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
      className="min-h-11 min-w-11 rounded px-2 text-xs text-white bg-blue-700 disabled:bg-stone-400"
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
