import { useState } from 'react'
import { EncodeProbePanel } from './components/EncodeProbePanel'
import { EventGuide } from './components/EventGuide'
import { EditorExport } from './components/EditorExport'
import { JoinPanel } from './components/JoinPanel'
import { MediaList } from './components/MediaList'
import { MediaPicker } from './components/MediaPicker'
import { PreviewCanvas } from './components/PreviewCanvas'
import { Section } from './components/Section'
import { TabBar } from './components/TabBar'
import { TipsGuide } from './components/TipsGuide'
import { NAKAMINATO } from './guide/nakaminato'
import { useAppStore } from './state/store'

// 4 つのタブ: 「イベントの栞」（当日の予定と地図）、「おすすめポイント」（撮っておくとよい場面）、
// 「動画編集」（写真と動画を複数入れて、尺・動き・開始位置・終了位置・テロップを編集し、プレビューで確かめて、
// 無音 MP4 に書き出す）、「つなげる」（全員の MP4 を集めて白フェードでつなぎ 1 本にする。ADR 017）。見た目の調整は M5。

type Tab = 'guide' | 'tips' | 'editor' | 'join'
const TABS: { id: Tab; label: string }[] = [
  { id: 'guide', label: 'イベントの栞' },
  { id: 'tips', label: 'おすすめ' },
  { id: 'editor', label: '動画編集' },
  { id: 'join', label: 'つなげる' },
]

export default function App() {
  // App は preset と meta だけ購読する（素材や尺が変わるたびに全タブを再描画しないため）
  const preset = useAppStore((s) => s.project.preset)
  const meta = useAppStore((s) => s.project.meta)
  const setMeta = useAppStore((s) => s.setMeta)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const [tab, setTab] = useState<Tab>('guide')

  function switchTab(next: Tab) {
    // 編集タブを離れるときは再生を止める（見えないまま動かさない）
    if (next !== 'editor') setPlaying(false)
    setTab(next)
  }

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">gvlog（M3 検証版）</h1>
        <p className="text-sm text-stone-600">
          {preset.width}x{preset.height} / {preset.fps}fps / 最長 {preset.maxFrames / preset.fps} 秒
          / MP4（音声なし。つなげるでは BGM を付けられます）
        </p>
      </header>

      <TabBar tabs={TABS} value={tab} onChange={switchTab} />

      <div className={tab === 'guide' ? '' : 'hidden'}>
        <EventGuide />
      </div>
      <div className={tab === 'tips' ? '' : 'hidden'}>
        <TipsGuide />
      </div>

      {/* 編集タブは隠すだけで外さない（取り込んだ画像や <video> を作り直さないため） */}
      <div className={`space-y-6 ${tab === 'editor' ? '' : 'hidden'}`}>
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

        {/* 上から順に作業する並び: 選ぶ → 素材（選んだ素材の下に設定） → プレビュー → 生成 → 保存 */}
        <MediaPicker />
        <Section title="素材">
          <MediaList />
        </Section>
        <Section title="動画のプレビュー">
          <PreviewCanvas />
        </Section>
        <Section title="書き出し">
          <EditorExport />
        </Section>

        <EncodeProbePanel preset={preset} />
      </div>

      {/* つなげるタブも隠すだけ（集めた動画を捨てないため） */}
      <div className={tab === 'join' ? '' : 'hidden'}>
        <JoinPanel defaultCoverText={NAKAMINATO.title} />
      </div>

      <footer className="text-xs text-stone-500">
        <p>{navigator.userAgent}</p>
      </footer>
    </main>
  )
}
