import { EncodeProbePanel } from './components/EncodeProbePanel'
import { ExportPanel } from './components/ExportPanel'
import { ItemEditor } from './components/ItemEditor'
import { MediaList } from './components/MediaList'
import { PhotoPicker } from './components/PhotoPicker'
import { PreviewCanvas } from './components/PreviewCanvas'
import { useAppStore } from './state/store'

// 写真を複数入れて、尺・動き・テロップを編集し、プレビューで確かめて、無音 MP4 に書き出す。
// 動画素材は M3(B) で足す。
// 見た目の調整は M5。

export default function App() {
  const preset = useAppStore((s) => s.project.preset)
  const meta = useAppStore((s) => s.project.meta)
  const setMeta = useAppStore((s) => s.setMeta)

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">gvlog（M3 検証版）</h1>
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
      <ExportPanel />

      <EncodeProbePanel preset={preset} />

      <footer className="text-xs text-stone-500">
        <p>{navigator.userAgent}</p>
      </footer>
    </main>
  )
}
