type Props<T extends string> = {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/**
 * 画面上部のタブ。見出しの帯と同じく -mx-4 で main の余白を打ち消し、画面の幅いっぱいに並べる。
 * 選択中のタブは画面と同じ地色で下の線を消し（-mb-px で線に重ねる）、中身とつながって見えるようにする。選択していないタブは灰色の地。
 */
export function TabBar<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div className="-mx-4 flex gap-1 border-b border-stone-400 px-1" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            className={`min-h-11 flex-1 rounded-t border px-1 text-xs sm:text-sm ${
              active
                ? '-mb-px border-stone-400 border-b-stone-100 bg-stone-100 font-bold text-stone-900'
                : 'border-transparent bg-stone-300 text-stone-600'
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
