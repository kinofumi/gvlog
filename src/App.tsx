import { EncodeProbePanel } from './components/EncodeProbePanel'
import { ItemEditor } from './components/ItemEditor'
import { MediaList } from './components/MediaList'
import { PhotoPicker } from './components/PhotoPicker'
import { PreviewCanvas } from './components/PreviewCanvas'
import { useAppStore } from './state/store'

// M2 の画面: 写真を複数入れて、尺・動き・テロップを編集し、プレビューで確かめる。
// 書き出しは M3 でタイムラインにつなぎ直す（M0 の書き出しは src/export/ に残してある）。
// 見た目の調整は M5。

export default function App() {
  const preset = useAppStore((s) => s.project.preset)
  const meta = useAppStore((s) => s.project.meta)
  const setMeta = useAppStore((s) => s.setMeta)
  const busy = useAppStore((s) => s.ui.isPlaying)

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">gvlog（M2 プレビュー版）</h1>
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
            value={meta.memberName}
            onChange={(e) => setMeta({ ...meta, memberName: e.target.value })}
            placeholder="例: 木下"
          />
        </label>
        <label className="block">
          <span className="text-sm">スポット</span>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            value={meta.spot}
            onChange={(e) => setMeta({ ...meta, spot: e.target.value })}
            placeholder="例: 清水寺"
          />
        </label>
      </section>

      <PreviewCanvas />
      <PhotoPicker />
      <MediaList />
      <ItemEditor />

      <EncodeProbePanel preset={preset} disabled={busy} onProbingChange={() => {}} />

      <footer className="text-xs text-stone-500">
        <p>{navigator.userAgent}</p>
      </footer>
    </main>
  )
}
