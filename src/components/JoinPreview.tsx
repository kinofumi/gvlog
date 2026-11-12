import { useEffect, useMemo, useRef, useState } from 'react'
import { previewSteps, type PreviewStep } from '../join/previewSteps'
import type { ImportedVideo } from '../media/importVideo'
import type { Project } from '../model/types'
import { renderFrame, type ProvidedImage } from '../render/renderFrame'
import { useAppStore } from '../state/store'
import { compileTimeline } from '../timeline/compile'
import { Button } from './ui/Button'

type Props = {
  project: Project
  /** 表紙・終わり・各動画のポスター（止め絵の描画に使う） */
  images: Record<string, ProvidedImage>
  videos: Record<string, ImportedVideo>
  /** 流す BGM のファイル。無ければ無音 */
  bgmUrl: string | null
  /** この画面が表示されているか。隠れたら止める */
  active: boolean
}

/** 止め絵を描く canvas の内部の幅（出力の 1/3。画面では小さく出すので十分） */
const CANVAS_WIDTH = 360

/**
 * つなげるの簡易プレビュー（ADR 017 追記）: 表紙の止め絵 → 各動画を順に再生 → 白い終わり、に BGM を重ねる。
 * 白フェードと BGM の末尾のフェードアウトは出ない（本物は生成した動画で確かめる）。
 * 動画は <video> を 1 つだけ使い、1 本終わるごとに次のファイルに差し替える（全員分を同時に持たない。iPhone の上限を避ける）。
 * 素材の音は出さない（出力にも入らない）。BGM は <audio> でループさせ、再生ボタンの操作の中で始める（iPhone は操作からしか音を始められない）。
 */
export function JoinPreview({ project, images, videos, bgmUrl, active }: Props) {
  const exporting = useAppStore((s) => s.ui.exporting)
  const steps = useMemo(() => previewSteps(project.items), [project.items])
  const compiled = useMemo(() => compileTimeline(project.items), [project.items])
  // 再生の状態: 始めたときの手順と今の番号。null なら止まっている。
  // 手順が変わった（素材や表紙の文字が変わった）、画面が隠れた、書き出しが始まった、のどれでも「止まっている」とみなす
  const [run, setRun] = useState<{ steps: PreviewStep[]; index: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const { width, height, fps } = project.preset
  const step = run && run.steps === steps && active && !exporting ? steps[run.index] : null
  const playing = step !== null

  function stop() {
    setRun(null)
  }

  // 止め絵の手順では canvas にそのフレームを描く。止まっているときは最初の手順（表紙があれば表紙。文字の確認になる）
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = CANVAS_WIDTH
    canvas.height = Math.round((CANVAS_WIDTH * height) / width)
    if (steps.length === 0) {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }
    const shown = step ?? steps[0]
    const frame = shown.kind === 'card' ? shown.frame : 0
    renderFrame(compiled, project.items, frame, ctx, { get: (id) => images[id] ?? BLANK })
  }, [compiled, project.items, images, steps, step, width, height])

  // 手順を進める。止め絵は時間で、動画は終わったら次へ
  useEffect(() => {
    const video = videoRef.current
    const audio = audioRef.current
    if (!video || !audio) return
    if (step === null) {
      video.pause()
      video.removeAttribute('src')
      video.load()
      audio.pause()
      audio.currentTime = 0
      return
    }
    const next = () =>
      setRun((r) => (r && r.index + 1 < r.steps.length ? { ...r, index: r.index + 1 } : null))
    if (step.kind === 'card') {
      video.pause()
      const timer = setTimeout(next, (step.durationFrames / fps) * 1000)
      return () => clearTimeout(timer)
    }
    const clip = videos[step.itemId]
    if (!clip) {
      next()
      return
    }
    const url = URL.createObjectURL(clip.blob)
    video.src = url
    video.currentTime = 0
    void video.play().catch(next)
    video.onended = next
    video.onerror = next
    return () => {
      video.onended = null
      video.onerror = null
      URL.revokeObjectURL(url)
    }
  }, [step, videos, fps])

  function start() {
    if (steps.length === 0) return
    const audio = audioRef.current
    if (audio && bgmUrl) {
      audio.src = bgmUrl
      audio.loop = true
      audio.currentTime = 0
      void audio.play().catch(() => {})
    }
    setRun({ steps, index: 0 })
  }

  const showVideo = step?.kind === 'clip'
  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-600">
        順番と表紙、BGM
        の雰囲気を確かめるための簡易版です。白フェードと曲の終わりのフェードアウトは出ません（素材の音も出ません）。
      </p>
      <div
        className="relative mx-auto w-full max-w-60 overflow-hidden rounded bg-black"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <canvas ref={canvasRef} className={`block h-full w-full ${showVideo ? 'hidden' : ''}`} />
        <video
          ref={videoRef}
          className={`block h-full w-full object-cover ${showVideo ? '' : 'hidden'}`}
          muted
          playsInline
          preload="auto"
        />
        <audio ref={audioRef} preload="none" />
      </div>
      <div className="flex items-center gap-3">
        <Button
          className="w-24"
          disabled={steps.length === 0 || exporting}
          onClick={() => (playing ? stop() : start())}
        >
          {playing ? '停止' : '再生'}
        </Button>
        <span className="text-sm text-stone-600">{playing ? step.label : ''}</span>
      </div>
    </div>
  )
}

/** 画像がまだ無い素材の代わり。黒い 1×1 */
const BLANK: ProvidedImage = { image: blankCanvas(), width: 1, height: 1 }

function blankCanvas(): CanvasImageSource {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  return c
}
