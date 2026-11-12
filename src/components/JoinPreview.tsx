import { useEffect, useMemo, useRef, useState } from 'react'
import { previewSteps, type PreviewStep } from '../join/previewSteps'
import type { ImportedVideo } from '../media/importVideo'
import type { Project } from '../model/types'
import { BLANK_IMAGE } from '../preview/blankImage'
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

/** 再生していてよい条件の目印（useMemo で作る。条件が 1 つでも変わると別のオブジェクトになる） */
type Session = { steps: PreviewStep[] }

/** 止め絵を描く canvas の内部の幅（出力の 1/3。画面では小さく出すので十分） */
const PLAY_BLOCKED =
  '動画の再生を始められませんでした。iPhone の低電力モードでは動かないことがあります。生成した動画で確かめてください。'

const CANVAS_WIDTH = 360

/**
 * つなげるの簡易プレビュー（ADR 017 追記）: 表紙の止め絵 → 各動画を順に再生 → 白い終わり、に BGM を重ねる。
 * 白フェードと BGM の末尾のフェードアウトは出ない（本物は生成した動画で確かめる）。
 * 動画は <video> を 1 つだけ使い、1 本終わるごとに次のファイルに差し替える（全員分を同時に持たない。iPhone の上限を避ける）。
 * 素材の音は出さない（出力にも入らない）。BGM は <audio> でループさせ、再生ボタンの操作の中で始める（iPhone は操作からしか音を始められない）。
 */
export function JoinPreview({ project, images, videos, bgmUrl, active }: Props) {
  const exporting = useAppStore((s) => s.ui.exporting)
  const { width, height, fps, maxFrames } = project.preset
  const steps = useMemo(() => previewSteps(project.items, maxFrames), [project.items, maxFrames])
  const compiled = useMemo(() => compileTimeline(project.items), [project.items])
  // 「再生していてよい条件」の目印。手順（素材や表紙の文字）、曲、画面の表示、書き出し、のどれかが変わると新しいものになる
  const session = useMemo(
    () => ({ steps }),
    // bgmUrl / active / exporting は値を使わないが、変わったら新しい目印にしたいので依存に入れる
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps, bgmUrl, active, exporting],
  )
  // 再生の状態: 始めたときの目印と今の番号。null なら止まっている。
  // 目印が今のものと違えば（素材が変わった、曲を変えた、画面が隠れた、書き出しが始まった）止まっているとみなし、戻っても勝手に再開しない
  const [run, setRun] = useState<{ session: Session; index: number } | null>(null)
  const [message, setMessage] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const step = run && run.session === session && active && !exporting ? steps[run.index] : null
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
    // 動画の手順中は canvas は隠れているので描かない（次の止め絵のときに描く）
    if (step?.kind === 'clip') return
    if (steps.length === 0) {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }
    const shown = step ?? steps[0]
    const frame = shown.kind === 'card' ? shown.frame : 0
    renderFrame(compiled, project.items, frame, ctx, { get: (id) => images[id] ?? BLANK_IMAGE })
  }, [compiled, project.items, images, steps, step, width, height])

  // 手順を進める。どの手順も長さは durationFrames（出力と同じ）。動画は再生が始まってから数える（読み込みの待ちは足す）。
  // 動画が尺より短ければ最後のフレームで止まったまま待ち（出力と同じ）、尺より長ければ途中で次へ（上限で切り詰めたとき）。
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
    // 「次へ」は 1 手順につき 1 回だけ（再生の失敗が catch と error の両方から届いても 2 つ進まない。片付けのあとは無視）
    let done = false
    const next = () => {
      if (done) return
      done = true
      setRun((r) =>
        r && r.index + 1 < r.session.steps.length ? { ...r, index: r.index + 1 } : null,
      )
    }
    const durationMs = (step.durationFrames / fps) * 1000
    let timer: ReturnType<typeof setTimeout> | undefined
    if (step.kind === 'card') {
      video.pause()
      timer = setTimeout(next, durationMs)
      return () => {
        done = true
        clearTimeout(timer)
      }
    }
    const clip = videos[step.itemId]
    if (!clip) {
      next()
      return
    }
    const url = URL.createObjectURL(clip.blob)
    video.src = url
    video.currentTime = 0
    video.onplaying = () => {
      video.onplaying = null
      timer = setTimeout(next, durationMs)
    }
    // 壊れたファイルは飛ばす。再生そのものを始められない（iPhone の低電力モードなど）ときは止めて知らせる
    video.onerror = next
    void video.play().catch((error: unknown) => {
      if (done) return
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        done = true
        setMessage(PLAY_BLOCKED)
        setRun(null)
      } else {
        next()
      }
    })
    return () => {
      done = true
      clearTimeout(timer)
      video.onplaying = null
      video.onerror = null
      URL.revokeObjectURL(url)
    }
  }, [step, videos, fps])

  // 画面から外れるときは音を止める（JoinPanel は隠すだけで外さないが、念のため）
  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [])

  function start() {
    if (steps.length === 0) return
    setMessage('')
    // 操作の中で一度 play() を呼んでおく（iPhone はこれで、この <video> を操作の外からも動かせるようになる。まだ src が無いので失敗は無視）
    void videoRef.current?.play().catch(() => {})
    const audio = audioRef.current
    if (audio && bgmUrl) {
      audio.src = bgmUrl
      audio.loop = true
      audio.currentTime = 0
      void audio.play().catch(() => {})
    }
    setRun({ session, index: 0 })
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
      {message && <p className="text-sm text-red-700">{message}</p>}
    </div>
  )
}
