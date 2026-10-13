type Props<T extends string> = {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/** 画面上部のタブ。選択中は下線と太字 */
export function TabBar<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div className="flex border-b border-stone-300" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            className={`min-h-11 flex-1 border-b-2 px-4 text-sm ${
              active ? 'border-stone-900 font-bold' : 'border-transparent text-stone-500'
            }`}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
