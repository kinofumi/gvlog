import { mapsSearchUrl } from '../guide/mapsLink'
import { NAKAMINATO } from '../guide/nakaminato'
import { Section } from './Section'

/** イベントの栞: タイムスケジュールと、各スポットの Google マップへのリンク。見出しは他のタブと同じ Section の帯 */
export function EventGuide() {
  const guide = NAKAMINATO
  return (
    <Section title={guide.title} icon="clock">
      <p className="text-sm text-stone-600">{guide.intro}</p>
      <ol className="space-y-3 pt-2">
        {guide.stops.map((stop) => (
          <li key={`${stop.time}-${stop.title}`} className="flex gap-3">
            <span className="w-12 shrink-0 pt-0.5 text-sm font-bold tabular-nums">{stop.time}</span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-bold">{stop.title}</p>
              <p className="text-sm text-stone-600">{stop.note}</p>
              <a
                className="inline-block min-h-11 py-2 text-sm text-blue-700 underline"
                href={mapsSearchUrl(stop.mapQuery)}
                target="_blank"
                rel="noreferrer"
              >
                Google マップで開く
              </a>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-stone-600">{guide.closing}</p>
    </Section>
  )
}
