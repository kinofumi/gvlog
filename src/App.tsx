import { useState } from 'react'
import { EventGuide } from './components/EventGuide'
import { EditorExport } from './components/EditorExport'
import { JoinPanel } from './components/JoinPanel'
import { MediaList } from './components/MediaList'
import { MediaPicker } from './components/MediaPicker'
import { PreviewCanvas } from './components/PreviewCanvas'
import { Section } from './components/Section'
import { Splash } from './components/Splash'
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
  const setPlaying = useAppStore((s) => s.setPlaying)
  const [tab, setTab] = useState<Tab>('guide')
  // 起動時の表紙（Splash）。消えたら false。アプリの画面はその下で先に組み立てておく
  const [splash, setSplash] = useState(true)

  function switchTab(next: Tab) {
    // 編集タブを離れるときは再生を止める（見えないまま動かさない）
    if (next !== 'editor') setPlaying(false)
    setTab(next)
  }

  return (
    <>
      {splash && <Splash onDone={() => setSplash(false)} />}
      {/* 表紙の間は裏の画面を inert にして、タブや VoiceOver のフォーカスが表紙の裏に行かないようにする */}
      <main className="mx-auto max-w-md space-y-6 px-4 py-6" inert={splash}>
        {/* 見出し（アプリ名と仕様の行）、画面下の UA、エンコードテスト（診断）は本番前に外した（2026-11-13、利用者の指示）。アプリ名はタブのタイトルと favicon だけに残る */}
        <TabBar tabs={TABS} value={tab} onChange={switchTab} />

        <div className={tab === 'guide' ? '' : 'hidden'}>
          <EventGuide />
        </div>
        <div className={tab === 'tips' ? '' : 'hidden'}>
          <TipsGuide />
        </div>

        {/* 編集タブは隠すだけで外さない（取り込んだ画像や <video> を作り直さないため） */}
        <div className={tab === 'editor' ? '' : 'hidden'}>
          {/* 上から順に作業する並び: 選ぶ → 素材（選んだ素材の下に設定） → プレビュー → 生成 → 保存 */}
          <MediaPicker />
          <Section title="素材" icon="film">
            <MediaList />
          </Section>
          <Section title="動画のプレビュー" icon="play">
            <PreviewCanvas />
          </Section>
          <Section title="書き出し" icon="download">
            <EditorExport />
          </Section>
        </div>

        {/* つなげるタブも隠すだけ（集めた動画を捨てないため） */}
        <div className={tab === 'join' ? '' : 'hidden'}>
          <JoinPanel defaultCoverText={NAKAMINATO.coverText} active={tab === 'join'} />
        </div>
      </main>
    </>
  )
}
