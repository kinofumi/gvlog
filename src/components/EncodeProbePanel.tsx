import { useState } from 'react'
import { useAppStore } from '../state/store'
import type { GroupPreset } from '../model/types'
import { EXPORT_BITRATE, probeAll, type ProbeResult } from '../export/codec'
import { Button } from './ui/Button'

type Props = {
  preset: GroupPreset
}

/** M0 の診断: この端末で H.264 のどの設定が実際にエンコードできるかを一覧にする */
export function EncodeProbePanel({ preset }: Props) {
  const [probes, setProbes] = useState<ProbeResult[] | null>(null)
  // 診断中は store に知らせる（書き出しと同時にエンコーダを動かさないため）。書き出し中・再生中は押せない
  const probing = useAppStore((s) => s.ui.probing)
  const setProbing = useAppStore((s) => s.setProbing)
  const disabled = useAppStore((s) => s.ui.exporting || s.ui.isPlaying)

  async function onProbe() {
    setProbing(true)
    setProbes(null)
    try {
      setProbes(await probeAll(preset.width, preset.height, preset.fps, EXPORT_BITRATE))
    } finally {
      setProbing(false)
    }
  }

  return (
    <section className="space-y-2">
      <Button variant="secondary" disabled={disabled || probing} onClick={onProbe}>
        {probing ? 'エンコードテスト中…' : 'エンコードテスト（診断）'}
      </Button>
      {probes && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-stone-500">
              <th>コーデック</th>
              <th>mode</th>
              <th>判定</th>
              <th>実際</th>
              <th>ms</th>
            </tr>
          </thead>
          <tbody>
            {probes.map((p) => (
              <tr
                key={`${p.fullCodecString}-${p.latencyMode}`}
                className="border-t border-stone-200"
              >
                <td>{p.fullCodecString ?? '(auto)'}</td>
                <td>{p.latencyMode}</td>
                <td>{p.claimed ? '可' : '不可'}</td>
                <td className={p.encodeOk ? 'text-green-700' : 'text-red-700'}>
                  {p.encodeOk ? '成功' : p.error}
                </td>
                <td>{p.ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
