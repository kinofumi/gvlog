import { useRef, useState } from 'react'
import { MediaError } from '../media/errors'
import { isVideoFile } from '../media/fileTypes'
import { importImage } from '../media/importImage'
import { importVideo } from '../media/importVideo'
import { makeVideoPoster } from '../media/videoPoster'
import { newId } from '../model/ids'
import type { GroupPreset } from '../model/types'
import { useAppStore, type NewEntry } from '../state/store'
import { maxItems } from '../timeline/durations'
import { Section } from './Section'
import { Button } from './ui/Button'

/** iPhone / iPad かどうか（案内文の出し分けにだけ使う）。iPad の Safari は UA が Macintosh なので、タッチの有無で見分ける */
const IS_IOS =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

/** ポスター（動画の先頭フレーム）の大きさ。出力の半分で、サムネイルとプレビューの代用に足りる */
const POSTER_SCALE = 0.5

/**
 * 写真と動画を複数選んで取り込む。取り込みは直列（スマホのメモリを一度に使わないため）、
 * store への追加は全部そろってから 1 回（尺の割り直しを 1 回にする）。
 */
export function MediaPicker() {
  const preset = useAppStore((s) => s.project.preset)
  const count = useAppStore((s) => s.project.items.length)
  const addItems = useAppStore((s) => s.addItems)
  const importing = useAppStore((s) => s.ui.importing)
  const exporting = useAppStore((s) => s.ui.exporting)
  const setImporting = useAppStore((s) => s.setImporting)
  const [messages, setMessages] = useState<string[]>([])
  const [progress, setProgress] = useState('')
  const [timing, setTiming] = useState<string[]>([])
  // ファイル選択の input は見せず、ボタンから開く（素の input はスマホで小さく、目立たない）
  const inputRef = useRef<HTMLInputElement>(null)

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    const notes: string[] = []
    setMessages([])
    setImporting(true)
    const limit = maxItems(preset.totalFrames)
    const room = limit - useAppStore.getState().project.items.length
    const picked = Array.from(files)
    if (picked.length > room)
      notes.push(`素材は ${limit} 個までです。先頭の ${room} 個だけ追加します。`)

    const entries: NewEntry[] = []
    const targets = picked.slice(0, Math.max(0, room))
    setTiming([])
    try {
      for (const [i, file] of targets.entries()) {
        setProgress(`${i + 1} / ${targets.length} 個目を読み込み中…`)
        const startedAt = performance.now()
        try {
          const entry = isVideoFile(file)
            ? await importOneVideo(file, preset, notes)
            : await importOnePhoto(file, preset)
          entries.push(entry)
          if (import.meta.env.DEV) {
            // 取り込みの速さを実機で測るための表示（開発サーバーだけ）
            const ms = Math.round(performance.now() - startedAt)
            setTiming((t) => [...t, `${file.name} (${file.type || '種類不明'}) ${ms}ms`])
          }
        } catch (error) {
          notes.push(
            error instanceof MediaError ? error.message : `${file.name} を読み込めませんでした。`,
          )
        }
      }
      addItems(entries)
    } finally {
      setProgress('')
      setMessages(notes)
      setImporting(false)
    }
  }

  return (
    <Section
      title={
        <>
          写真・動画を追加{' '}
          <span className="text-sm font-normal text-stone-500">
            （{count} / {maxItems(preset.totalFrames)} 個）
          </span>
        </>
      }
    >
      {/* iOS は accept に HEIC を書いても JPEG に変換して渡す（2026-10-13 に iOS 18.7 で確認）。image/* で十分 */}
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          void onPick(e.target.files)
          e.target.value = ''
        }}
      />
      <Button disabled={importing || exporting} onClick={() => inputRef.current?.click()}>
        {importing ? '取り込み中…' : 'ファイルを選ぶ'}
      </Button>
      {IS_IOS && (
        <p className="text-xs text-stone-500">
          iPhone で「高効率（HEIC）」で撮った写真は、選んだあと JPEG への変換に時間がかかります。
          カメラ設定の「フォーマット」を「互換性優先」にすると速くなります。
        </p>
      )}
      {progress && <p className="text-sm text-stone-600">{progress}</p>}
      {messages.map((m, i) => (
        <p key={i} className="text-sm text-red-700">
          {m}
        </p>
      ))}
      {timing.length > 0 && (
        <ul className="text-xs text-stone-500">
          {timing.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </Section>
  )
}

async function importOnePhoto(file: File, preset: GroupPreset): Promise<NewEntry> {
  const imported = await importImage(file, preset.width, preset.height)
  const itemId = newId()
  return {
    itemId,
    // blobKey / thumbKey は M4（IndexedDB 保存）で本物の鍵になる。今は素材 ID で埋める
    info: {
      kind: 'photo',
      blobKey: itemId,
      thumbKey: itemId,
      fileName: file.name,
      width: imported.width,
      height: imported.height,
    },
    image: { image: imported.bitmap, width: imported.width, height: imported.height },
  }
}

/** 動画を開いてポスターを作る。ポスターに失敗したら動画も解放する（store にはまだ渡していない） */
async function importOneVideo(file: File, preset: GroupPreset, notes: string[]): Promise<NewEntry> {
  const video = await importVideo(file)
  const width = Math.round(preset.width * POSTER_SCALE)
  const height = Math.round(preset.height * POSTER_SCALE)
  let poster: ImageBitmap
  try {
    poster = await makeVideoPoster(video, width, height)
  } catch (error) {
    video.input.dispose()
    throw error
  }
  if (video.isHdr) {
    // 色が変わる可能性がある（plan §9）。実機で確認するまでは止めず、案内だけ出す
    notes.push(`${file.name} は HDR 動画です。書き出した色が元と違って見えることがあります。`)
  }
  const itemId = newId()
  return {
    itemId,
    info: {
      kind: 'video',
      blobKey: itemId,
      thumbKey: itemId,
      fileName: file.name,
      width: video.width,
      height: video.height,
      // durationSec は末尾の時刻なので、先頭の時刻（0 でないことがある）を引いて実際の長さにする
      sourceDurationFrames: Math.floor((video.durationSec - video.firstTimestampSec) * preset.fps),
    },
    image: { image: poster, width, height },
    video,
  }
}
