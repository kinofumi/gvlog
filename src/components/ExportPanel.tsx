import { useEffect, useRef, useState } from 'react'
import { exportProject } from '../export/exportProject'
import { ExportCancelled, type ExportProgress } from '../export/exportVideo'
import { buildFileName } from '../export/naming'
import { canShareFile, downloadFile, shareFile } from '../export/share'
import type { ImportedVideo } from '../media/importVideo'
import type { Project } from '../model/types'
import type { ProvidedImage } from '../render/renderFrame'
import { useAppStore } from '../state/store'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

type Phase =
  | { kind: 'idle' }
  /** progress が null の間は、使えるエンコーダの確認中（初回は数秒かかる） */
  | { kind: 'exporting'; progress: ExportProgress | null }
  | { kind: 'done'; file: File; codecString: string; elapsedMs: number }
  | { kind: 'error'; message: string }

type Props = {
  /** 書き出すプロジェクトと、その素材の画像・動画。編集タブは store のもの、つなげるタブは集めた動画から組み立てたもの */
  project: Project
  images: Record<string, ProvidedImage>
  videos: Record<string, ImportedVideo>
  /** できた MP4 のファイル名に使う名前の並び（buildFileName に渡す。時刻は書き出しが終わったときに付ける） */
  fileNames: string[]
  /** 付ける BGM（デコード済みのモノラル PCM）。無ければ無音 */
  bgm?: Float32Array | null
  /** まだ始められない（BGM の読み込み中など）。理由は呼び出し側が自分の場所に出す */
  waiting?: boolean
}

/** 書き出し: 開始、進捗、キャンセル、共有 / ダウンロード。エンコーダは端末に 1 本なので、どのタブから始めても store の exporting で排他する */
export function ExportPanel({ project, images, videos, fileNames, bgm = null, waiting }: Props) {
  const setPlaying = useAppStore((s) => s.setPlaying)
  const importing = useAppStore((s) => s.ui.importing)
  // 別のタブ（編集 / つなげる）の ExportPanel が書き出し中かもしれない。エンコーダは 1 本なので store の印で排他する
  const busy = useAppStore((s) => s.ui.exporting)
  const setExporting = useAppStore((s) => s.setExporting)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [shareMessage, setShareMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const exporting = phase.kind === 'exporting'
  // 取り込み中（素材が増える途中）、別のタブの書き出し中は始めない
  const canExport = project.items.length > 0 && !busy && !importing && !waiting

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
      const result = await exportProject(
        project,
        images,
        videos,
        (progress) => setPhase({ kind: 'exporting', progress }),
        controller.signal,
        { bgm },
      )
      const file = new File([result.blob], buildFileName(fileNames), { type: 'video/mp4' })
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

  // 共有シートが閉じたらポップアップで知らせる（iOS の「ビデオを保存」は進み具合が見えないので、終わったことを明示する）
  async function onShare(file: File) {
    const outcome = await shareFile(file)
    if (outcome === 'shared') setShareMessage('保存・共有が完了しました。')
    if (outcome === 'cancelled') setShareMessage('')
    if (outcome === 'failed')
      setShareMessage('共有できませんでした。「ダウンロード」をお試しください。')
  }

  return (
    <section className="space-y-3">
      {!exporting && (
        <Button disabled={!canExport} onClick={onExport}>
          動画を生成
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
                {phase.progress.stage === 'bgm'
                  ? 'BGM を付けています…'
                  : `${phase.progress.frame} / ${phase.progress.totalFrames} フレーム`}
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
            <Button onClick={() => onShare(phase.file)}>保存・共有</Button>
          )}
          <Button variant="secondary" onClick={() => downloadFile(phase.file)}>
            ダウンロード
          </Button>
          {shareMessage && <Dialog onClose={() => setShareMessage('')}>{shareMessage}</Dialog>}
        </div>
      )}
    </section>
  )
}
