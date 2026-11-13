import { mapsSearchUrl } from '../guide/mapsLink'
import { NAKAMINATO_TIPS } from '../guide/tips'
import { Section } from './Section'
import { ExternalLink } from './ui/ExternalLink'

/** おすすめポイント: 撮っておくとよい場面の一覧。場所があれば Google マップへのリンク。見出しは他のタブと同じ Section の帯 */
export function TipsGuide() {
  const guide = NAKAMINATO_TIPS
  return (
    <Section title={guide.title} icon="pin">
      <p className="text-sm text-stone-600">{guide.intro}</p>
      {guide.mapUrl && (
        <ExternalLink href={guide.mapUrl}>全体の地図を開く（Google マイマップ）</ExternalLink>
      )}
      <ul className="space-y-3 pt-2">
        {guide.tips.map((tip) => (
          <li key={tip.title} className="space-y-1 rounded border border-stone-300 p-3">
            <p className="text-sm font-bold">{tip.title}</p>
            {tip.note && <p className="text-sm text-stone-600">{tip.note}</p>}
            {tip.mapQuery && (
              <ExternalLink href={mapsSearchUrl(tip.mapQuery)}>Google マップで開く</ExternalLink>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}
