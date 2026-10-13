import { useEffect, useMemo, useState, type RefObject } from 'react'
import { renderFrame, type ProvidedImage } from '../render/renderFrame'
import { compileTimeline } from '../timeline/compile'
import { useAppStore } from '../state/store'
import { frameAtElapsed } from './clock'

/** プレビューの内部解像度の上限（CSS ピクセル × dpr）。大きくしても画面では見えず、描画が重くなるだけ */
const MAX_DPR = 1.5

/**
 * プレビュー用のキャンバスに、再生位置のフレームを描く。再生中は requestAnimationFrame で進める。
 * 描画は書き出しと同じ renderFrame を使う（プレビューと出力の見た目を揃えるため）。
 * store の購読は素材・プリセット・画像・再生位置に絞る（名前の入力などで再描画しない）。
 */
export function usePreview(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  const items = useAppStore((s) => s.project.items)
  const preset = useAppStore((s) => s.project.preset)
  const images = useAppStore((s) => s.images)
  const playheadFrame = useAppStore((s) => s.ui.playheadFrame)
  const isPlaying = useAppStore((s) => s.ui.isPlaying)
  const seek = useAppStore((s) => s.seek)
  const setPlaying = useAppStore((s) => s.setPlaying)

  const compiled = useMemo(() => compileTimeline(items), [items])
  // キャンバスの内部解像度。変わったら再描画する（サイズ変更で描画内容が消えるため）
  const [size, setSize] = useState({ width: 0, height: 0 })

  // キャンバスの内部解像度を、表示幅に合わせる（縦横比はプリセット）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const width = Math.round(canvas.clientWidth * dpr)
      const height = Math.round((width * preset.height) / preset.width)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        setSize({ width, height })
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [canvasRef, preset.width, preset.height])

  // 再生位置や素材が変わるたびに 1 フレーム描く
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const provider = { get: (itemId: string): ProvidedImage => images[itemId] ?? BLANK }
    renderFrame(compiled, items, playheadFrame, ctx, provider)
  }, [canvasRef, compiled, items, images, playheadFrame, size])

  // 再生: 開始時刻からの経過時間でフレームを決める。末尾で止まる
  useEffect(() => {
    if (!isPlaying) return
    const { fps, totalFrames } = preset
    // 再生開始時の位置だけ使うので、store から直接読む（playheadFrame を依存に入れると毎フレーム再起動する）
    const current = useAppStore.getState().ui.playheadFrame
    // 末尾で止まっているときに再生したら先頭から
    const startFrame = current >= totalFrames - 1 ? 0 : current
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
  }, [isPlaying, preset, seek, setPlaying])
}

/** 画像がまだ無い素材の代わり（M4 の復元中など）。黒い 1x1 */
const BLANK: ProvidedImage = { image: blankCanvas(), width: 1, height: 1 }

function blankCanvas(): CanvasImageSource {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  return c
}
