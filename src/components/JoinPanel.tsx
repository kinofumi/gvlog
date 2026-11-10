import { useMemo, useRef, useState } from 'react'
import { buildFileName } from '../export/naming'
import { JOIN_FADE_FRAMES, JOIN_PRESET, buildJoinProject } from '../join/joinProject'
import { MediaError } from '../media/errors'
import { isVideoFile } from '../media/fileTypes'
import { importOneVideo } from '../media/importEntries'
import { useAppStore, type NewVideo } from '../state/store'
import { sumFrames } from '../timeline/durations'
import { ExportPanel } from './ExportPanel'
import { Section } from './Section'
import { Thumbnail } from './Thumbnail'
import { Button } from './ui/Button'
import { SmallButton } from './ui/SmallButton'

/**
 * つなげる: 全員が作った MP4 を集めて順に並べ、白フェードでつないで 1 本にする（ADR 017）。
 * 集めた動画はこの画面が持つ（編集タブの素材とは別）。プロジェクトは buildJoinProject で組み立て、書き出しは編集と同じ ExportPanel。
 * プレビューは無し（編集済みの動画を並べるだけなので、順番とサムネイルで足りる）。
 */
export function JoinPanel() {
  const exporting = useAppStore((s) => s.ui.exporting)
  const [clips, setClips] = useState<NewVideo[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const project = useMemo(() => buildJoinProject(clips), [clips])
  const images = useMemo(() => Object.fromEntries(clips.map((c) => [c.itemId, c.image])), [clips])
  const videos = useMemo(() => Object.fromEntries(clips.map((c) => [c.itemId, c.video])), [clips])
  const { fps } = JOIN_PRESET
  const totalSec = sumFrames(project.items.map((i) => i.durationFrames)) / fps

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
          const entry = await importOneVideo(file, JOIN_PRESET, notes)
          if ('video' in entry) added.push(entry)
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
          {JOIN_FADE_FRAMES / fps} 秒の白フェードでつないだ 1 本の動画になります。
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
            全部で {totalSec.toFixed(1)} 秒（{clips.length} 本）
          </p>
        )}
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
