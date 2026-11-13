import { mapsSearchUrl } from '../guide/mapsLink'
import { NAKAMINATO_TIPS } from '../guide/tips'
import { Section } from './Section'

/** おすすめポイント: 撮っておくとよい場面の一覧。場所があれば Google マップへのリンク。見出しは他のタブと同じ Section の帯 */
export function TipsGuide() {
  const guide = NAKAMINATO_TIPS
  return (
    <Section title={guide.title} icon="pin">
      <p className="text-sm text-stone-600">{guide.intro}</p>
      {guide.mapUrl && (
        <a
          className="inline-block min-h-11 py-2 text-sm text-blue-700 underline"
          href={guide.mapUrl}
          target="_blank"
          rel="noreferrer"
        >
          全体の地図を開く（Google マイマップ）
        </a>
      )}
      <ul className="space-y-3 pt-2">
        {guide.tips.map((tip) => (
          <li key={tip.title} className="space-y-1 rounded border border-stone-300 p-3">
            <p className="text-sm font-bold">{tip.title}</p>
            {tip.note && <p className="text-sm text-stone-600">{tip.note}</p>}
            {tip.mapQuery && (
              <a
                className="inline-block min-h-11 py-2 text-sm text-blue-700 underline"
                href={mapsSearchUrl(tip.mapQuery)}
                target="_blank"
                rel="noreferrer"
              >
                Google マップで開く
              </a>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}
