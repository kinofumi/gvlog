import { useRef, useState } from 'react'
import { DEFAULT_PRESET } from './model/defaults'
import { importImage, type ImportedImage } from './media/importImage'
import { importVideo, type ImportedVideo } from './media/importVideo'
import { MediaError } from './media/errors'
import { ExportCancelled, exportVideo, type ExportProgress } from './export/exportVideo'
import { buildFileName } from './export/naming'
import { canShareFile, downloadFile, shareFile } from './export/share'
import { Button } from './components/ui/Button'
import { EncodeProbePanel } from './components/EncodeProbePanel'

// M0 の最小 UI: 写真 1 枚と動画 1 本を選び、10 秒の無音 MP4 を書き出して保存する。
// 見た目の調整は M5 で行う。ここでは動くことを確かめるのが目的。

type Phase =
  | { kind: 'idle' }
  | { kind: 'exporting'; progress: ExportProgress }
  | { kind: 'done'; file: File; fullCodecString: string; latencyMode: string; elapsedMs: number }
  | { kind: 'error'; message: string }

export default function App() {
  const preset = DEFAULT_PRESET
  const [memberName, setMemberName] = useState('')
  const [spot, setSpot] = useState('')
  const [photo, setPhoto] = useState<ImportedImage | null>(null)
  const [video, setVideo] = useState<ImportedVideo | null>(null)
  const [mediaMessage, setMediaMessage] = useState('')
  const [importing, setImporting] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [shareMessage, setShareMessage] = useState('')
  const [probing, setProbing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // 前の素材は、新しい素材が読み込めてから（または失敗が確定してから）解放する。
  // await の前に閉じると、読み込みが重なったときに違う素材を閉じてしまう。
  function replacePhoto(next: ImportedImage | null) {
    setPhoto((previous) => {
      previous?.bitmap.close()
      return next
    })
  }

  function replaceVideo(next: ImportedVideo | null) {
    setVideo((previous) => {
      previous?.input.dispose()
      return next
    })
  }

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    setMediaMessage('')
    setImporting(true)
    try {
      replacePhoto(await importImage(file, preset.width, preset.height))
    } catch (error) {
      replacePhoto(null)
      setMediaMessage(
        error instanceof MediaError ? error.message : '写真の読み込みに失敗しました。',
      )
    } finally {
      setImporting(false)
    }
  }

  async function onPickVideo(file: File | undefined) {
    if (!file) return
    setMediaMessage('')
    setImporting(true)
    try {
      replaceVideo(await importVideo(file))
    } catch (error) {
      replaceVideo(null)
      setMediaMessage(
        error instanceof MediaError ? error.message : '動画の読み込みに失敗しました。',
      )
    } finally {
      setImporting(false)
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
        latencyMode: result.latencyMode,
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
    if (outcome === 'failed')
      setShareMessage('共有できませんでした。「ダウンロード」をお試しください。')
  }

  // 取り込み中・書き出し中・診断中は、素材の差し替えと書き出し開始を止める
  // （使用中の資源を閉じてしまう、エンコーダが同時に動く、を避けるため）
  const busy = importing || phase.kind === 'exporting' || probing
  const canExport = (photo !== null || video !== null) && !busy

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-6">
      <header>
        <h1 className="text-xl font-bold">groupe-vlog（M0 検証版）</h1>
        <p className="text-sm text-stone-600">
          {preset.width}x{preset.height} / {preset.fps}fps / {preset.totalFrames / preset.fps} 秒 /
          無音 MP4
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
            disabled={busy}
            onChange={(e) => onPickPhoto(e.target.files?.[0])}
          />
        </label>
        {photo && (
          <p className="text-xs text-stone-600">
            読み込み済み: {photo.originalWidth}x{photo.originalHeight} → {photo.width}x
            {photo.height}
          </p>
        )}

        <label className="block">
          <span className="text-sm">動画（1 本）</span>
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept="video/*"
            disabled={busy}
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
          <Button disabled={!canExport} onClick={onExport}>
            書き出す
          </Button>
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
              {(phase.elapsedMs / 1000).toFixed(1)} 秒、{phase.fullCodecString} /{' '}
              {phase.latencyMode}）
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

      <EncodeProbePanel preset={preset} disabled={busy} onProbingChange={setProbing} />

      <footer className="text-xs text-stone-500">
        <p>{navigator.userAgent}</p>
      </footer>
    </main>
  )
}
