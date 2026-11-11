import { useMemo, useRef, useState } from 'react'
import { buildFileName } from '../export/naming'
import { NAKAMINATO } from '../guide/nakaminato'
import { COVER_COLOR, END_COLOR, makeSolidImage } from '../join/cards'
import {
  JOIN_COVER_FRAMES,
  JOIN_COVER_ID,
  JOIN_END_ID,
  JOIN_FADE_FRAMES,
  JOIN_PRESET,
  buildJoinProject,
} from '../join/joinProject'
import { MediaError } from '../media/errors'
import { isVideoFile } from '../media/fileTypes'
import { importOneVideo } from '../media/importEntries'
import { useAppStore, type NewVideo } from '../state/store'
import { overflowFrames, sumFrames } from '../timeline/durations'
import { ExportPanel } from './ExportPanel'
import { Section } from './Section'
import { Thumbnail } from './Thumbnail'
import { Button } from './ui/Button'
import { SmallButton } from './ui/SmallButton'

/**
 * つなげる: 全員が作った MP4 を集めて順に並べ、白フェードでつないで 1 本にする（ADR 017）。
 * 集めた動画はこの画面が持つ（編集タブの素材とは別）。プロジェクトは buildJoinProject で組み立て、書き出しは編集と同じ ExportPanel。
 * プレビューは無し（編集済みの動画を並べるだけなので、順番とサムネイルで足りる）。
 * 取り込み中・書き出し中の印は store のもの（ui.importing / ui.exporting）を使う。タブをまたいで 1 つずつにするため。
 * 集めた動画の解放は「削除」のときだけ。この画面は App が隠すだけで外さないので、アンマウント時の解放は持たない。
 * 先頭に表紙（文字は入力欄で変えられる）、最後は白フェードアウトして終わる。表紙と終わりの絵は 1 色の canvas で、ここで 1 回だけ作る。
 */
export function JoinPanel() {
  const exporting = useAppStore((s) => s.ui.exporting)
  const importing = useAppStore((s) => s.ui.importing)
  const setImporting = useAppStore((s) => s.setImporting)
  const [clips, setClips] = useState<NewVideo[]>([])
  const [coverText, setCoverText] = useState(NAKAMINATO.title)
  const [progress, setProgress] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const project = useMemo(() => buildJoinProject(clips, coverText), [clips, coverText])
  const cards = useMemo(
    () => ({
      [JOIN_COVER_ID]: makeSolidImage(JOIN_PRESET.width, JOIN_PRESET.height, COVER_COLOR),
      [JOIN_END_ID]: makeSolidImage(JOIN_PRESET.width, JOIN_PRESET.height, END_COLOR),
    }),
    [],
  )
  const images = useMemo(
    () => ({ ...cards, ...Object.fromEntries(clips.map((c) => [c.itemId, c.image])) }),
    [cards, clips],
  )
  const videos = useMemo(() => Object.fromEntries(clips.map((c) => [c.itemId, c.video])), [clips])
  const { fps, maxFrames } = JOIN_PRESET
  const durations = project.items.map((i) => i.durationFrames)
  const totalSec = sumFrames(durations) / fps
  // 上限（10 分）を超えた分は出力に入らない（ADR 015 と同じ切り捨て）
  const overflowSec = overflowFrames(durations, maxFrames) / fps

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    const notes: string[] = []
    setMessages([])
    setImporting(true)
    const added: NewVideo[] = []
    try {
      const targets = Array.from(files)
      for (const [i, file] of targets.entries()) {
        setProgress(`${i + 1} / ${targets.length} 本目を読み込み中…`)
        try {
          if (!isVideoFile(file)) throw new MediaError(`${file.name} は動画ではありません。`)
          added.push(await importOneVideo(file, JOIN_PRESET, notes))
        } catch (error) {
          notes.push(
            error instanceof MediaError ? error.message : `${file.name} を読み込めませんでした。`,
          )
        }
      }
      setClips((prev) => [...prev, ...added])
    } finally {
      setProgress('')
      setMessages(notes)
      setImporting(false)
    }
  }

  function remove(itemId: string) {
    const clip = clips.find((c) => c.itemId === itemId)
    setClips((prev) => prev.filter((c) => c.itemId !== itemId))
    // 画面から外したら解放する（メモリ上の動画は大きい）
    clip?.image.image.close()
    clip?.video.input.dispose()
  }

  function move(index: number, to: number) {
    if (to < 0 || to >= clips.length) return
    const next = [...clips]
    const [clip] = next.splice(index, 1)
    next.splice(to, 0, clip)
    setClips(next)
  }

  return (
    <div className="space-y-6">
      <Section title="みんなの動画を集める">
        <p className="text-sm text-stone-600">
          それぞれが生成した MP4 を選びます。順番を並べ替えて「つなげて生成」を押すと、
          {(JOIN_FADE_FRAMES / fps).toFixed(1)} 秒の白フェードでつないだ 1
          本の動画になります。先頭に {JOIN_COVER_FRAMES / fps}{' '}
          秒の表紙が付き、最後は白くフェードアウトして終わります。
        </p>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="video/*"
          multiple
          onChange={(e) => {
            void onPick(e.target.files)
            e.target.value = ''
          }}
        />
        <Button disabled={importing || exporting} onClick={() => inputRef.current?.click()}>
          {importing ? '読み込み中…' : '動画を選ぶ'}
        </Button>
        {progress && <p className="text-sm text-stone-600">{progress}</p>}
        {messages.map((m, i) => (
          <p key={i} className="text-sm text-red-700">
            {m}
          </p>
        ))}
      </Section>

      <Section title="順番">
        {clips.length === 0 ? (
          <p className="text-sm text-stone-600">動画を選ぶと、ここに並びます。</p>
        ) : (
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
                    onClick={() => move(index, index - 1)}
                  />
                  <SmallButton
                    label="▼"
                    disabled={index === clips.length - 1 || exporting}
                    onClick={() => move(index, index + 1)}
                  />
                  <SmallButton
                    label="削除"
                    disabled={exporting}
                    onClick={() => remove(clip.itemId)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {clips.length > 0 && (
          <p className="text-sm text-stone-600">
            全部で {totalSec.toFixed(1)} 秒（{clips.length} 本。表紙と終わりを含む）
          </p>
        )}
        {overflowSec > 0 && (
          <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            上限の {maxFrames / fps / 60} 分を超えた末尾 {overflowSec.toFixed(1)}{' '}
            秒は、生成する動画に入りません。本数を減らしてください。
          </p>
        )}
      </Section>

      <Section title="表紙">
        <label className="block space-y-1 text-sm">
          <span>表紙の文字（改行できます。空にすると表紙なし）</span>
          <textarea
            className="w-full rounded border border-stone-300 px-2 py-1 text-base"
            rows={2}
            value={coverText}
            disabled={exporting}
            onChange={(e) => setCoverText(e.target.value)}
          />
        </label>
      </Section>

      <Section title="つなげて生成">
        <ExportPanel
          project={project}
          images={images}
          videos={videos}
          fileName={buildFileName(JOIN_PRESET.name, 'みんな', 'つなげる')}
        />
      </Section>
    </div>
  )
}
