import { useRef, useState } from 'react'
import { DEFAULT_PRESET } from './model/defaults'
import { importImage, type ImportedImage } from './media/importImage'
import { importVideo, type ImportedVideo } from './media/importVideo'
import { MediaError } from './media/errors'
import { ExportCancelled, exportVideo, type ExportProgress } from './export/exportVideo'
import { buildFileName } from './export/naming'
import { canShareFile, downloadFile, shareFile } from './export/share'

// M0 の最小 UI: 写真 1 枚と動画 1 本を選び、10 秒の無音 MP4 を書き出して保存する。
// 見た目の調整は M5 で行う。ここでは動くことを確かめるのが目的。

type Phase =
  | { kind: 'idle' }
  | { kind: 'exporting'; progress: ExportProgress }
  | { kind: 'done'; file: File; fullCodecString: string; elapsedMs: number }
  | { kind: 'error'; message: string }

export default function App() {
  const preset = DEFAULT_PRESET
  const [memberName, setMemberName] = useState('')
  const [spot, setSpot] = useState('')
  const [photo, setPhoto] = useState<ImportedImage | null>(null)
  const [video, setVideo] = useState<ImportedVideo | null>(null)
  const [mediaMessage, setMediaMessage] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [shareMessage, setShareMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    setMediaMessage('')
    try {
      photo?.bitmap.close()
      setPhoto(await importImage(file, preset.width, preset.height))
    } catch (error) {
      setPhoto(null)
      setMediaMessage(error instanceof MediaError ? error.message : '写真の読み込みに失敗しました。')
    }
  }

  async function onPickVideo(file: File | undefined) {
    if (!file) return
    setMediaMessage('')
    try {
      video?.input.dispose()
      setVideo(await importVideo(file))
    } catch (error) {
      setVideo(null)
      setMediaMessage(error instanceof MediaError ? error.message : '動画の読み込みに失敗しました。')
    }
  }

  async function onExport() {
    const controller = new AbortController()
    abortRef.current = controller
    setShareMessage('')
    setPhase({ kind: 'exporting', progress: { frame: 0, totalFrames: preset.totalFrames } })
    try {
      const result = await exportVideo(
        { preset, photo: photo?.bitmap ?? null, video },
        (progress) => setPhase({ kind: 'exporting', progress }),
        controller.signal,
      )
      const name = buildFileName(preset.name, memberName, spot)
      const file = new File([result.blob], name, { type: 'video/mp4' })
      if (import.meta.env.DEV) {
        // 自動テストが書き出し結果を取り出すためのフック（開発モードだけ）
        ;(window as unknown as { __lastExport?: File }).__lastExport = file
      }
      setPhase({
        kind: 'done',
        file,
        fullCodecString: result.fullCodecString,
        elapsedMs: result.elapsedMs,
      })
    } catch (error) {
      if (error instanceof ExportCancelled) {
        setPhase({ kind: 'idle' })
      } else {
        setPhase({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    } finally {
      abortRef.current = null
    }
  }

  async function onShare(file: File) {
    const outcome = await shareFile(file)
    if (outcome === 'shared') setShareMessage('共有しました。')
    if (outcome === 'cancelled') setShareMessage('')
    if (outcome === 'failed') setShareMessage('共有できませんでした。「ダウンロード」をお試しください。')
  }

  const canExport = (photo !== null || video !== null) && phase.kind !== 'exporting'

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-6">
      <header>
        <h1 className="text-xl font-bold">groupe-vlog（M0 検証版）</h1>
        <p className="text-sm text-stone-600">
          {preset.width}x{preset.height} / {preset.fps}fps / {preset.totalFrames / preset.fps} 秒 / 無音 MP4
        </p>
      </header>

      <section className="space-y-3">
        <label className="block">
          <span className="text-sm">名前</span>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="例: 木下"
          />
        </label>
        <label className="block">
          <span className="text-sm">スポット</span>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            value={spot}
            onChange={(e) => setSpot(e.target.value)}
            placeholder="例: 清水寺"
          />
        </label>
      </section>

      <section className="space-y-3">
        <label className="block">
          <span className="text-sm">写真（1 枚）</span>
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept="image/*"
            onChange={(e) => onPickPhoto(e.target.files?.[0])}
          />
        </label>
        {photo && (
          <p className="text-xs text-stone-600">
            読み込み済み: {photo.originalWidth}x{photo.originalHeight} → {photo.width}x{photo.height}
          </p>
        )}

        <label className="block">
          <span className="text-sm">動画（1 本）</span>
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept="video/*"
            onChange={(e) => onPickVideo(e.target.files?.[0])}
          />
        </label>
        {video && (
          <ul className="text-xs text-stone-600 space-y-0.5">
            <li>コーデック: {video.codec}</li>
            <li>
              表示サイズ: {video.width}x{video.height}（回転 {video.rotation}°）
            </li>
            <li>尺: {video.durationSec.toFixed(2)} 秒</li>
            <li>
              色: {video.transfer ?? '不明'}
              {video.isHdr && '（HDR。色の変化を確認してください）'}
            </li>
          </ul>
        )}
        {mediaMessage && <p className="text-sm text-red-700">{mediaMessage}</p>}
      </section>

      <section className="space-y-3">
        {phase.kind !== 'exporting' && (
          <button
            className="w-full rounded bg-stone-900 px-4 py-3 text-white disabled:bg-stone-400"
            disabled={!canExport}
            onClick={onExport}
          >
            書き出す
          </button>
        )}

        {phase.kind === 'exporting' && (
          <div className="space-y-2">
            <progress
              className="w-full"
              value={phase.progress.frame}
              max={phase.progress.totalFrames}
            />
            <p className="text-sm">
              {phase.progress.frame} / {phase.progress.totalFrames} フレーム
            </p>
            <button
              className="w-full rounded border border-stone-400 px-4 py-3"
              onClick={() => abortRef.current?.abort()}
            >
              キャンセル
            </button>
          </div>
        )}

        {phase.kind === 'error' && <p className="text-sm text-red-700">{phase.message}</p>}

        {phase.kind === 'done' && (
          <div className="space-y-2">
            <p className="text-sm">
              完了: {phase.file.name}（{(phase.file.size / 1024 / 1024).toFixed(1)} MB、
              {(phase.elapsedMs / 1000).toFixed(1)} 秒、{phase.fullCodecString}）
            </p>
            {canShareFile(phase.file) && (
              <button
                className="w-full rounded bg-stone-900 px-4 py-3 text-white"
                onClick={() => onShare(phase.file)}
              >
                共有（写真に保存）
              </button>
            )}
            <button
              className="w-full rounded border border-stone-400 px-4 py-3"
              onClick={() => downloadFile(phase.file)}
            >
              ダウンロード
            </button>
            {shareMessage && <p className="text-sm">{shareMessage}</p>}
          </div>
        )}
      </section>

      <footer className="text-xs text-stone-500">
        <p>{navigator.userAgent}</p>
      </footer>
    </main>
  )
}
