import { useState } from 'react'
import { importImage } from '../media/importImage'
import { MediaError } from '../media/errors'
import { newId } from '../model/ids'
import { useAppStore } from '../state/store'
import { maxItems } from '../timeline/durations'

/** 写真を複数選んで順に取り込む。取り込みは直列（iPhone のメモリを一度に使わないため） */
export function PhotoPicker() {
  const preset = useAppStore((s) => s.project.preset)
  const count = useAppStore((s) => s.project.items.length)
  const addPhoto = useAppStore((s) => s.addPhoto)
  const importing = useAppStore((s) => s.ui.importing)
  const setImporting = useAppStore((s) => s.setImporting)
  const [message, setMessage] = useState('')

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    setMessage('')
    setImporting(true)
    const limit = maxItems(preset.totalFrames)
    try {
      for (const file of Array.from(files)) {
        if (useAppStore.getState().project.items.length >= limit) {
          setMessage(`写真は ${limit} 枚までです。`)
          break
        }
        try {
          const imported = await importImage(file, preset.width, preset.height)
          const itemId = newId()
          addPhoto(
            itemId,
            // blobKey / thumbKey は M4（IndexedDB 保存）で本物の鍵になる。今は素材 ID で埋める
            {
              blobKey: itemId,
              thumbKey: itemId,
              fileName: file.name,
              width: imported.width,
              height: imported.height,
            },
            { image: imported.bitmap, width: imported.width, height: imported.height },
          )
        } catch (error) {
          setMessage(
            error instanceof MediaError ? error.message : `${file.name} を読み込めませんでした。`,
          )
        }
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="space-y-2">
      <label className="block">
        <span className="text-sm">
          写真を追加（{count} / {maxItems(preset.totalFrames)} 枚）
        </span>
        <input
          className="mt-1 block w-full text-sm"
          type="file"
          accept="image/*"
          multiple
          disabled={importing}
          onChange={(e) => {
            void onPick(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {importing && <p className="text-sm text-stone-600">読み込み中…</p>}
      {message && <p className="text-sm text-red-700">{message}</p>}
    </section>
  )
}
