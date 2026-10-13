import { useEffect, useRef } from 'react'
import { coverRect } from '../render/coverRect'
import type { ProvidedImage } from '../render/renderFrame'

const SIZE = 64

/** 素材一覧の小さなサムネイル（プレビューと同じ cover の切り出し） */
export function Thumbnail({ source }: { source: ProvidedImage | undefined }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, SIZE, SIZE)
    if (!source) return
    const r = coverRect(source.width, source.height, SIZE, SIZE)
    ctx.drawImage(source.image, r.sx, r.sy, r.sw, r.sh, 0, 0, SIZE, SIZE)
  }, [source])
  return (
    <canvas ref={ref} width={SIZE} height={SIZE} className="h-16 w-16 shrink-0 rounded bg-black" />
  )
}
