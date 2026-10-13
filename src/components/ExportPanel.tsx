import { useEffect, useRef, useState } from 'react'
import { exportProject, ExportCancelled, type ExportProgress } from '../export/exportVideo'
import { buildFileName } from '../export/naming'
import { canShareFile, downloadFile, shareFile } from '../export/share'
import { useAppStore } from '../state/store'
import { Button } from './ui/Button'

type Phase =
  | { kind: 'idle' }
  /** progress が null の間は、使えるエンコーダの確認中（初回は数秒かかる） */
  | { kind: 'exporting'; progress: ExportProgress | null }
  | { kind: 'done'; file: File; codecString: string; elapsedMs: number }
  | { kind: 'error'; message: string }

/** 書き出し: 開始、進捗、キャンセル、共有 / ダウンロード */
export function ExportPanel() {
  const project = useAppStore((s) => s.project)
  const images = useAppStore((s) => s.images)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const importing = useAppStore((s) => s.ui.importing)
  const probing = useAppStore((s) => s.ui.probing)
  const setExporting = useAppStore((s) => s.setExporting)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [shareMessage, setShareMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const exporting = phase.kind === 'exporting'
  // 取り込み中（尺が変わる）と診断中（エンコーダが使用中）は始めない
  const canExport = project.items.length > 0 && !exporting && !importing && !probing

  // 画面を離れたら書き出しを中断する（続けても結果を受け取る相手がいない）
  useEffect(() => () => abortRef.current?.abort(), [])

  async function onExport() {
    const controller = new AbortController()
    abortRef.current = controller
    // 画面が隠れたら（画面ロック、アプリ切り替え）中断する。main thread の書き出しは裏では進まない（plan §4.2）
    let hidden = false
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hidden = true
        controller.abort()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    setPlaying(false)
    setExporting(true)
    setShareMessage('')
    setPhase({ kind: 'exporting', progress: null })
    try {
      // 動画素材のデコーダは M3(B) で渡す。今は写真だけ
      const result = await exportProject(
        project,
        images,
        new Map(),
        (progress) => setPhase({ kind: 'exporting', progress }),
        controller.signal,
      )
      const name = buildFileName(project.preset.name, project.meta.memberName, project.meta.spot)
      const file = new File([result.blob], name, { type: 'video/mp4' })
      if (import.meta.env.DEV) {
        // 自動テストが書き出し結果を取り出すためのフック（開発モードだけ）
        ;(window as unknown as { __lastExport?: File }).__lastExport = file
      }
      setPhase({ kind: 'done', file, codecString: result.codecString, elapsedMs: result.elapsedMs })
    } catch (error) {
      if (error instanceof ExportCancelled) {
        setPhase(
          hidden
            ? {
                kind: 'error',
                message: '画面が隠れたため中断しました。もう一度書き出してください。',
              }
            : { kind: 'idle' },
        )
      } else {
        setPhase({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    } finally {
      document.removeEventListener('visibilitychange', onVisibility)
      abortRef.current = null
      setExporting(false)
    }
  }

  async function onShare(file: File) {
    const outcome = await shareFile(file)
    if (outcome === 'shared') setShareMessage('共有しました。')
    if (outcome === 'cancelled') setShareMessage('')
    if (outcome === 'failed')
      setShareMessage('共有できませんでした。「ダウンロード」をお試しください。')
  }

  return (
    <section className="space-y-3">
      {!exporting && (
        <Button disabled={!canExport} onClick={onExport}>
          書き出す
        </Button>
      )}

      {phase.kind === 'exporting' && (
        <div className="space-y-2">
          {phase.progress ? (
            <>
              <progress
                className="w-full"
                value={phase.progress.frame}
                max={phase.progress.totalFrames}
              />
              <p className="text-sm">
                {phase.progress.frame} / {phase.progress.totalFrames} フレーム
              </p>
            </>
          ) : (
            <p className="text-sm">この端末で使えるエンコーダを確認中…</p>
          )}
          <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
            キャンセル
          </Button>
        </div>
      )}

      {phase.kind === 'error' && <p className="text-sm text-red-700">{phase.message}</p>}

      {phase.kind === 'done' && (
        <div className="space-y-2">
          <p className="text-sm">
            完了: {phase.file.name}（{(phase.file.size / 1024 / 1024).toFixed(1)} MB、
            {(phase.elapsedMs / 1000).toFixed(1)} 秒、{phase.codecString}）
          </p>
          {canShareFile(phase.file) && (
            <Button onClick={() => onShare(phase.file)}>共有（写真に保存）</Button>
          )}
          <Button variant="secondary" onClick={() => downloadFile(phase.file)}>
            ダウンロード
          </Button>
          {shareMessage && <p className="text-sm">{shareMessage}</p>}
        </div>
      )}
    </section>
  )
}
