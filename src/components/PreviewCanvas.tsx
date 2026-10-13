import { useRef } from 'react'
import { usePreview } from '../preview/usePreview'
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
          className="w-24"
          disabled={!hasItems && !isPlaying}
          onClick={() => setPlaying(!isPlaying)}
        >
          {isPlaying ? '停止' : '再生'}
        </Button>
        <input
          className="flex-1"
          type="range"
          min={0}
          max={preset.totalFrames - 1}
          step={1}
          value={playheadFrame}
          onChange={(e) => {
            setPlaying(false)
            seek(Number(e.target.value))
          }}
        />
        <span className="w-20 text-right text-sm tabular-nums">
          {(playheadFrame / preset.fps).toFixed(1)} / {preset.totalFrames / preset.fps} 秒
        </span>
      </div>
    </section>
  )
}
