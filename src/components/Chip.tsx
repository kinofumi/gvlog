/** 選択肢を 1 つ選ぶ丸いボタン（タッチしやすい高さ 44px） */
export function Chip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`min-h-11 rounded-full border px-4 text-sm disabled:opacity-40 ${
        active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-400'
      }`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/** 選択肢の並びをまとめて描く。value が一致するものがアクティブ */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.id} label={o.label} active={value === o.id} onClick={() => onChange(o.id)} />
      ))}
    </div>
  )
}
