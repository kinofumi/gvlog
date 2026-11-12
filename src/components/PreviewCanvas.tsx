import { useRef } from 'react'
import { usePreview } from '../preview/usePreview'
import { outputFramesOf } from '../state/projectActions'
import { useAppStore } from '../state/store'
import { Button } from './ui/Button'

/** プレビュー: キャンバス、再生 / 一時停止、シーク */
export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  usePreview(canvasRef)
  const preset = useAppStore((s) => s.project.preset)
  const playheadFrame = useAppStore((s) => s.ui.playheadFrame)
  const isPlaying = useAppStore((s) => s.ui.isPlaying)
  const seek = useAppStore((s) => s.seek)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const hasItems = useAppStore((s) => s.project.items.length > 0)
  // 出力の長さ（合計、上限で切った値）。シークの範囲と表示に使う
  const totalFrames = useAppStore((s) => outputFramesOf(s.project))
  // 書き出し中は CPU を取り合わないよう再生しない
  const exporting = useAppStore((s) => s.ui.exporting)

  return (
    <section className="space-y-2">
      <canvas
        ref={canvasRef}
        className="block w-full rounded bg-black"
        style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
      />
      <div className="flex items-center gap-3">
        {/* 再生中は素材が無くても止められるようにする */}
        <Button
          size="small"
          disabled={(!hasItems && !isPlaying) || exporting}
          onClick={() => setPlaying(!isPlaying)}
        >
          {isPlaying ? '停止' : '再生'}
        </Button>
        {/* 書き出し中はシークも止める（動画のプレビューがデコードを始めるため） */}
        <input
          className="flex-1"
          type="range"
          min={0}
          max={Math.max(0, totalFrames - 1)}
          step={1}
          value={playheadFrame}
          disabled={exporting || totalFrames === 0}
          onChange={(e) => {
            setPlaying(false)
            seek(Number(e.target.value))
          }}
        />
        <span className="w-20 text-right text-sm tabular-nums">
          {(playheadFrame / preset.fps).toFixed(1)} / {(totalFrames / preset.fps).toFixed(1)} 秒
        </span>
      </div>
    </section>
  )
}
