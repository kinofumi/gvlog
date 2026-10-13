import { useEffect, useMemo, useState, type RefObject } from 'react'
import { renderFrame, type ProvidedImage, type RenderItem } from '../render/renderFrame'
import { compileTimeline } from '../timeline/compile'
import { useAppStore } from '../state/store'
import { frameAtElapsed } from './clock'

/** プレビューの内部解像度の上限（CSS ピクセル × dpr）。大きくしても画面では見えず、描画が重くなるだけ */
const MAX_DPR = 1.5

/**
 * プレビュー用のキャンバスに、再生位置のフレームを描く。再生中は requestAnimationFrame で進める。
 * 描画は書き出しと同じ renderFrame を使う（プレビューと出力の見た目を揃えるため）。
 */
export function usePreview(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  const project = useAppStore((s) => s.project)
  const images = useAppStore((s) => s.images)
  const playheadFrame = useAppStore((s) => s.ui.playheadFrame)
  const isPlaying = useAppStore((s) => s.ui.isPlaying)
  const seek = useAppStore((s) => s.seek)
  const setPlaying = useAppStore((s) => s.setPlaying)

  const compiled = useMemo(() => compileTimeline(project.items), [project.items])
  // キャンバスの内部解像度。変わったら再描画する（サイズ変更で描画内容が消えるため）
  const [size, setSize] = useState({ width: 0, height: 0 })

  // キャンバスの内部解像度を、表示幅に合わせる（縦横比はプリセット）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const cssWidth = canvas.clientWidth
      const width = Math.round(cssWidth * dpr)
      const height = Math.round((width * project.preset.height) / project.preset.width)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        setSize({ width, height })
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [canvasRef, project.preset.width, project.preset.height])

  // 再生位置や素材が変わるたびに 1 フレーム描く
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const provider = { get: (itemId: string): ProvidedImage => images[itemId] ?? BLANK }
    renderFrame(compiled, project.items as RenderItem[], playheadFrame, ctx, provider)
  }, [canvasRef, compiled, project.items, images, playheadFrame, size])

  // 再生: 開始時刻からの経過時間でフレームを決める。末尾で止まる
  useEffect(() => {
    if (!isPlaying) return
    const { fps, totalFrames } = project.preset
    // 末尾で止まっているときに再生したら先頭から
    const startFrame = playheadFrame >= totalFrames - 1 ? 0 : playheadFrame
    const startedAt = performance.now()
    let handle = 0
    const tick = (now: number) => {
      const { frame, finished } = frameAtElapsed(startFrame, now - startedAt, fps, totalFrames)
      seek(frame)
      if (finished) setPlaying(false)
      else handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
    // playheadFrame は再生開始時の値だけ使う（毎フレーム再起動しないよう依存に入れない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, project.preset, seek, setPlaying])
}

/** 画像がまだ無い素材の代わり（M4 の復元中など）。黒い 1x1 */
const BLANK: ProvidedImage = {
  image: blankCanvas(),
  width: 1,
  height: 1,
}

function blankCanvas(): CanvasImageSource {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  return c
}
