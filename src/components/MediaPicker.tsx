import { useRef, useState } from 'react'
import { MediaError } from '../media/errors'
import { isVideoFile } from '../media/fileTypes'
import { importOnePhoto, importOneVideo } from '../media/importEntries'
import { VIDEO_MAX_SEC } from '../media/limits'
import { useAppStore } from '../state/store'
import { maxItems } from '../timeline/durations'
import { Section } from './Section'
import { Button } from './ui/Button'

/** iPhone / iPad かどうか（案内文の出し分けにだけ使う）。iPad の Safari は UA が Macintosh なので、タッチの有無で見分ける */
const IS_IOS =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

/**
 * 写真か動画を 1 点ずつ選んで取り込む（ADR 024。複数選択だと大きい動画で待ち時間が長く、固まったように見えるため）。
 * 動画は 30 秒まで。初期の尺は 5 秒（動画は元の長さまで）。
 */
export function MediaPicker() {
  const preset = useAppStore((s) => s.project.preset)
  const count = useAppStore((s) => s.project.items.length)
  const limit = maxItems(preset.maxFrames)
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
    const file = files?.[0]
    if (!file) return
    const notes: string[] = []
    setMessages([])
    setTiming([])
    setImporting(true)
    setProgress('読み込み中…')
    const startedAt = performance.now()
    try {
      const entry = isVideoFile(file)
        ? await importOneVideo(file, preset, notes, VIDEO_MAX_SEC)
        : await importOnePhoto(file, preset)
      addItems([entry])
      if (import.meta.env.DEV) {
        // 取り込みの速さを実機で測るための表示（開発サーバーだけ）
        const ms = Math.round(performance.now() - startedAt)
        setTiming([`${file.name} (${file.type || '種類不明'}) ${ms}ms`])
      }
    } catch (error) {
      notes.push(
        error instanceof MediaError ? error.message : `${file.name} を読み込めませんでした。`,
      )
    } finally {
      setProgress('')
      setMessages(notes)
      setImporting(false)
    }
  }

  return (
    <Section
      icon="photo"
      title={
        <>
          写真・動画を追加{' '}
          <span className="text-sm font-normal text-stone-200">
            （{count} / {limit} 個）
          </span>
        </>
      }
    >
      {/* iOS は accept に HEIC を書いても JPEG に変換して渡す（2026-10-13 に iOS 18.7 で確認）。image/* で十分。
          multiple は付けない（1 点ずつ。ADR 024） */}
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/*,video/*"
        onChange={(e) => {
          void onPick(e.target.files)
          e.target.value = ''
        }}
      />
      {/* 上限まで入ったら選べなくする（入らない素材を読み込ませない） */}
      <Button
        disabled={importing || exporting || count >= limit}
        onClick={() => inputRef.current?.click()}
      >
        {importing
          ? '取り込み中…'
          : count >= limit
            ? `素材は ${limit} 個までです`
            : 'ファイルを 1 つ選ぶ'}
      </Button>
      <p className="text-xs text-stone-500">
        写真か動画を 1 つずつ追加します。動画は {VIDEO_MAX_SEC} 秒までのものを選んでください。
      </p>
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
