import { useState } from 'react'
import { importImage } from '../media/importImage'
import { MediaError } from '../media/errors'
import { newId } from '../model/ids'
import { useAppStore, type LoadedImage } from '../state/store'
import { maxItems } from '../timeline/durations'

/** iPhone / iPad かどうか（案内文の出し分けにだけ使う） */
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

/**
 * 写真を複数選んで取り込む。取り込みは直列（iPhone のメモリを一度に使わないため）、
 * store への追加は全部そろってから 1 回（尺の割り直しを 1 回にする）。
 */
export function PhotoPicker() {
  const preset = useAppStore((s) => s.project.preset)
  const count = useAppStore((s) => s.project.items.length)
  const addPhotos = useAppStore((s) => s.addPhotos)
  const importing = useAppStore((s) => s.ui.importing)
  const setImporting = useAppStore((s) => s.setImporting)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState('')
  const [timing, setTiming] = useState<string[]>([])

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    setMessage('')
    setImporting(true)
    const limit = maxItems(preset.totalFrames)
    const room = limit - useAppStore.getState().project.items.length
    const picked = Array.from(files)
    if (picked.length > room)
      setMessage(`写真は ${limit} 枚までです。先頭の ${room} 枚だけ追加します。`)

    const photos: {
      itemId: string
      info: Parameters<typeof addPhotos>[0][number]['info']
      image: LoadedImage
    }[] = []
    const targets = picked.slice(0, Math.max(0, room))
    setTiming([])
    try {
      for (const [i, file] of targets.entries()) {
        setProgress(`${i + 1} / ${targets.length} 枚目を読み込み中…`)
        try {
          const startedAt = performance.now()
          const imported = await importImage(file, preset.width, preset.height)
          if (import.meta.env.DEV) {
            // 取り込みの速さを実機で測るための表示（開発サーバーだけ）
            const ms = Math.round(performance.now() - startedAt)
            setTiming((t) => [
              ...t,
              `${file.name} (${file.type || '種類不明'}) ${imported.originalWidth}x${imported.originalHeight} ${ms}ms`,
            ])
          }
          const itemId = newId()
          photos.push({
            itemId,
            // blobKey / thumbKey は M4（IndexedDB 保存）で本物の鍵になる。今は素材 ID で埋める
            info: {
              blobKey: itemId,
              thumbKey: itemId,
              fileName: file.name,
              width: imported.width,
              height: imported.height,
            },
            image: { image: imported.bitmap, width: imported.width, height: imported.height },
          })
        } catch (error) {
          setMessage(
            error instanceof MediaError ? error.message : `${file.name} を読み込めませんでした。`,
          )
        }
      }
      addPhotos(photos)
    } finally {
      setProgress('')
      setImporting(false)
    }
  }

  return (
    <section className="space-y-2">
      <label className="block">
        <span className="text-sm">
          写真を追加（{count} / {maxItems(preset.totalFrames)} 枚）
        </span>
        {/* HEIC を明示すると、iOS が JPEG に変換せずそのまま渡すことがある（渡されれば Safari が直接デコードできる） */}
        <input
          className="mt-1 block w-full text-sm"
          type="file"
          accept="image/*,.heic,.heif,image/heic,image/heif"
          multiple
          disabled={importing}
          onChange={(e) => {
            void onPick(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {IS_IOS && (
        <p className="text-xs text-stone-500">
          iPhone で「高効率（HEIC）」で撮った写真は、選んだあと JPEG への変換に時間がかかります。
          カメラ設定の「フォーマット」を「互換性優先」にすると速くなります。
        </p>
      )}
      {progress && <p className="text-sm text-stone-600">{progress}</p>}
      {message && <p className="text-sm text-red-700">{message}</p>}
      {timing.length > 0 && (
        <ul className="text-xs text-stone-500">
          {timing.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
