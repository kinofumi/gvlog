import { useMemo, useRef, useState } from 'react'
import { BGM_TRACKS, bgmUrl } from '../bgm/tracks'
import { useBgm } from '../bgm/useBgm'
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
import { BgmPicker } from './BgmPicker'
import { ExportPanel } from './ExportPanel'
import { JoinClipList } from './JoinClipList'
import { JoinPreview } from './JoinPreview'
import { Section } from './Section'
import { Button } from './ui/Button'

/**
 * つなげる: 全員が作った MP4 を集めて順に並べ、白フェードでつないで 1 本にする（ADR 017）。
 * 集めた動画はこの画面が持つ（編集タブの素材とは別）。プロジェクトは buildJoinProject で組み立て、書き出しは編集と同じ ExportPanel。
 * 取り込み中・書き出し中の印は store のもの（ui.importing / ui.exporting）を使う。タブをまたいで 1 つずつにするため。
 * 集めた動画の解放は「削除」のときだけ。この画面は App が隠すだけで外さないので、アンマウント時の解放は持たない。
 * 先頭に表紙（文字は入力欄で変えられる。初期値は App が渡す）、最後は白フェードアウトして終わる。表紙と終わりの絵は 1 色の canvas で、ここで 1 回だけ作る。
 * BGM（ADR 019）は useBgm が選択と読み込みを持ち、書き出しに song を渡す。読み込み中は生成を始めない。
 * プレビューは簡易版（JoinPreview。白フェード無しで順に再生し、BGM を重ねる。つなぎ目は生成した動画で確かめる）。
 */
export function JoinPanel({
  defaultCoverText,
  active,
}: {
  defaultCoverText: string
  active: boolean
}) {
  const exporting = useAppStore((s) => s.ui.exporting)
  const importing = useAppStore((s) => s.ui.importing)
  const setImporting = useAppStore((s) => s.setImporting)
  const [clips, setClips] = useState<NewVideo[]>([])
  const [coverText, setCoverText] = useState(defaultCoverText)
  const [progress, setProgress] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const bgm = useBgm()
  const bgmTrack = BGM_TRACKS.find((t) => t.id === bgm.id)

  const project = useMemo(() => buildJoinProject(clips, coverText), [clips, coverText])
  const cards = useMemo(
    () => ({
      [JOIN_COVER_ID]: makeSolidImage(COVER_COLOR),
      [JOIN_END_ID]: makeSolidImage(END_COLOR),
    }),
    [],
  )
  const images = useMemo(
    () => ({ ...cards, ...Object.fromEntries(clips.map((c) => [c.itemId, c.image])) }),
    [cards, clips],
  )
  const videos = useMemo(() => Object.fromEntries(clips.map((c) => [c.itemId, c.video])), [clips])
  const { fps, maxFrames } = JOIN_PRESET
  const hasCover = project.items.some((i) => i.itemId === JOIN_COVER_ID)
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
    <div>
      <Section title="みんなの動画を集める">
        <p className="text-sm text-stone-600">
          それぞれが生成した MP4 を選びます。順番を並べ替えて「つなげて生成」を押すと、
          {(JOIN_FADE_FRAMES / fps).toFixed(1)} 秒の白フェードでつないだ 1
          本の動画になります。表紙の文字を入れると先頭に {JOIN_COVER_FRAMES / fps}{' '}
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
        <JoinClipList
          clips={clips}
          fps={fps}
          exporting={exporting}
          hasCover={hasCover}
          totalSec={totalSec}
          overflowSec={overflowSec}
          maxFrames={maxFrames}
          onMove={move}
          onRemove={remove}
        />
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

      <Section title="BGM">
        <BgmPicker
          value={bgm.id}
          onChange={bgm.pick}
          disabled={exporting}
          supported={bgm.supported}
          status={bgm.loading ? 'BGM を読み込み中…（終わるまで生成は始められません）' : bgm.error}
          active={active}
        />
      </Section>

      <Section title="プレビュー">
        <JoinPreview
          project={project}
          images={images}
          videos={videos}
          bgmUrl={bgmTrack ? bgmUrl(bgmTrack) : null}
          active={active}
        />
      </Section>

      <Section title="つなげて生成">
        <ExportPanel
          project={project}
          images={images}
          videos={videos}
          fileNames={[JOIN_PRESET.name, 'つなげる']}
          bgm={bgm.song}
          waiting={bgm.loading}
        />
      </Section>
    </div>
  )
}
