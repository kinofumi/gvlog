import type { NewVideo } from '../state/store'
import { Thumbnail } from './Thumbnail'
import { SmallButton } from './ui/SmallButton'

type Props = {
  clips: NewVideo[]
  fps: number
  exporting: boolean
  hasCover: boolean
  /** 出力に入る全体の秒数（表紙と終わりを含む。プロジェクトの尺から JoinPanel が計算する） */
  totalSec: number
  /** 上限を超えて出力に入らない秒数（0 なら収まっている） */
  overflowSec: number
  maxFrames: number
  onMove: (index: number, to: number) => void
  onRemove: (itemId: string) => void
}

/** つなげるの「順番」: 集めた動画の一覧（サムネイル、長さ、並べ替え、削除）と合計、上限超過の注意 */
export function JoinClipList({
  clips,
  fps,
  exporting,
  hasCover,
  totalSec,
  overflowSec,
  maxFrames,
  onMove,
  onRemove,
}: Props) {
  if (clips.length === 0) {
    return <p className="text-sm text-stone-600">動画を選ぶと、ここに並びます。</p>
  }
  return (
    <>
      <ul className="space-y-2">
        {clips.map((clip, index) => (
          <li key={clip.itemId} className="flex gap-3 rounded border border-stone-300 p-2">
            <Thumbnail source={clip.image} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm">
                {index + 1}. {clip.info.fileName}
              </p>
              <p className="text-sm text-stone-600">
                {(clip.info.sourceDurationFrames / fps).toFixed(1)} 秒
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <SmallButton
                label="▲"
                disabled={index === 0 || exporting}
                onClick={() => onMove(index, index - 1)}
              />
              <SmallButton
                label="▼"
                disabled={index === clips.length - 1 || exporting}
                onClick={() => onMove(index, index + 1)}
              />
              <SmallButton
                label="削除"
                disabled={exporting}
                onClick={() => onRemove(clip.itemId)}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-stone-600">
        全部で {totalSec.toFixed(1)} 秒（{clips.length} 本。{hasCover ? '表紙と' : ''}
        終わりを含む）
      </p>
      {overflowSec > 0 && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          上限の {maxFrames / fps / 60} 分を超えた末尾 {overflowSec.toFixed(1)}{' '}
          秒は、生成する動画に入りません（最後の白フェードアウトも入りません）。本数を減らしてください。
        </p>
      )}
    </>
  )
}
