import { mapsSearchUrl } from '../guide/mapsLink'
import { NAKAMINATO } from '../guide/nakaminato'
import { Section } from './Section'
import { ExternalLink } from './ui/ExternalLink'

/**
 * イベントの栞: チラシ（docs/nakaminato00*.jpg）の内容を 3 つの帯に分けて見せる。
 * 1. イベントについて（日時・場所・コンセプト・大切にすること・準備）
 * 2. 当日の流れ（時刻つきの一覧。移動する行には Google マップへのリンク）
 * 3. 会場（住所と地図、注意書き）
 */
export function EventGuide() {
  const guide = NAKAMINATO
  return (
    <>
      <Section title={guide.title} icon="flag">
        <p className="text-sm font-bold">{guide.date}</p>
        <p className="text-sm text-stone-600">場所: {guide.place}</p>
        <p className="pt-2 text-base font-bold">{guide.catchphrase}</p>
        <p className="text-sm text-stone-600">{guide.concept}</p>
        <p className="pt-2 text-sm font-bold">この企画で大切にすること</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
          {guide.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="pt-2 text-sm font-bold">参加前の準備</p>
        <p className="text-sm text-stone-600">{guide.prep}</p>
        <p className="pt-2 text-xs text-stone-500">主催: {guide.organizer}</p>
      </Section>

      <Section title="当日の流れ" icon="clock">
        <ol className="space-y-3">
          {guide.stops.map((stop) => (
            <li key={`${stop.time}-${stop.title}`} className="flex gap-3">
              {/* 時刻が決まっていない行も、幅をそろえるために空の枠を置く */}
              <span className="w-12 shrink-0 pt-0.5 text-sm font-bold tabular-nums">
                {stop.time}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-bold">{stop.title}</p>
                {stop.note && <p className="text-sm text-stone-600">{stop.note}</p>}
                {stop.mapQuery && (
                  <ExternalLink href={mapsSearchUrl(stop.mapQuery)}>
                    Google マップで開く
                  </ExternalLink>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={`会場: ${guide.venue.name}`} icon="pin">
        <p className="text-sm">{guide.venue.address}</p>
        <ExternalLink href={mapsSearchUrl(guide.venue.mapQuery)}>Google マップで開く</ExternalLink>
        <p className="text-sm text-stone-600">{guide.venue.note}</p>
      </Section>
    </>
  )
}
