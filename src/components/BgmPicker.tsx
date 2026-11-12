import { useEffect, useRef } from 'react'
import { BGM_TRACKS, NO_BGM, bgmUrl } from '../bgm/tracks'

type Props = {
  /** 選んでいる曲の ID（NO_BGM なら無し） */
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  /** この端末で BGM 付きの MP4 を作れるか。null はまだ確認中 */
  supported: boolean | null
  /** 読み込み中や失敗の知らせ */
  status: string
  /** この画面が表示されているか。隠れたら試聴を止める（タブは隠すだけで外さないため） */
  active: boolean
}

/**
 * BGM を選ぶ（ADR 019）。曲ごとに <audio controls> で試聴できる（読み込みは再生ボタンを押してから）。
 * 作れない端末では曲を選べなくし、理由を出す。
 * 試聴は同時に 1 曲だけ（別の曲を再生したら前の曲を止める）。画面が隠れたときと書き出し中も止める。
 */
export function BgmPicker({ value, onChange, disabled, supported, status, active }: Props) {
  const canPick = !disabled && supported === true
  const listRef = useRef<HTMLDivElement>(null)
  const pauseAll = (except?: HTMLAudioElement) => {
    listRef.current?.querySelectorAll('audio').forEach((audio) => {
      if (audio !== except) audio.pause()
    })
  }
  useEffect(() => {
    if (!active || disabled) pauseAll()
  }, [active, disabled])
  return (
    <div ref={listRef} className="space-y-2">
      <p className="text-sm text-stone-600">
        曲は動画の長さに合わせて繰り返し、最後の 2 秒でゆっくり消えます。
      </p>
      {supported === false && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          この端末では BGM 付きの動画を作れません（iPhone は iOS 26 以降で使えます）。BGM
          なしで生成できます。
        </p>
      )}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="radio"
          name="bgm"
          checked={value === NO_BGM}
          disabled={disabled}
          onChange={() => onChange(NO_BGM)}
        />
        なし
      </label>
      {BGM_TRACKS.map((track) => (
        <div key={track.id} className="space-y-1 rounded border border-stone-300 p-2">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="bgm"
              checked={value === track.id}
              disabled={!canPick}
              onChange={() => onChange(track.id)}
            />
            <span className="flex-1">{track.title}</span>
            <span className="text-xs text-stone-500">{track.credit}</span>
          </label>
          {/* 試聴。preload="none" で、押すまで読み込まない */}
          <audio
            className="h-8 w-full"
            controls
            preload="none"
            src={bgmUrl(track)}
            onPlay={(e) => pauseAll(e.currentTarget)}
          />
        </div>
      ))}
      {status && <p className="text-sm text-stone-600">{status}</p>}
    </div>
  )
}
