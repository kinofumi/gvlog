import { useEffect, useRef, useState } from 'react'
import { canEncodeBgm, loadBgm } from './bgmAudio'
import { BGM_TRACKS, NO_BGM, bgmUrl } from './tracks'

export type BgmState = {
  /** 選んでいる曲の ID（NO_BGM なら無し） */
  id: string
  /** デコード済みの曲（モノラルの PCM）。読み込み中や無しなら null */
  song: Float32Array | null
  loading: boolean
  /** 失敗の知らせ（読み込み中は空） */
  error: string
  /** この端末で BGM 付きの MP4 を作れるか。null はまだ確認中 */
  supported: boolean | null
  /** 曲を選ぶ（読み込んでデコードする。選び直したら前の読み込みは捨てる） */
  pick: (id: string) => void
}

/**
 * BGM の選択と読み込み（ADR 019）。画面は BgmPicker、書き出しには song を渡す。
 * 対応の確認は最初に 1 回。読み込みに失敗したら「なし」に戻して理由を出す。
 */
export function useBgm(): BgmState {
  const [id, setId] = useState(NO_BGM)
  const [song, setSong] = useState<Float32Array | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supported, setSupported] = useState<boolean | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    canEncodeBgm()
      .then((ok) => {
        if (!cancelled) setSupported(ok)
      })
      .catch(() => {
        if (!cancelled) setSupported(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function pick(next: string) {
    abortRef.current?.abort()
    setId(next)
    setSong(null)
    setError('')
    const track = BGM_TRACKS.find((t) => t.id === next)
    if (!track) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const decoded = await loadBgm(bgmUrl(track), controller.signal)
      if (controller.signal.aborted) return
      setSong(decoded)
    } catch (e) {
      if (controller.signal.aborted) return
      setId(NO_BGM)
      setError(e instanceof Error ? e.message : 'BGM を読み込めませんでした。')
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }

  return { id, song, loading, error, supported, pick: (next) => void pick(next) }
}
