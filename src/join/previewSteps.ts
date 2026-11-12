import type { Project } from '../model/types'

/**
 * 簡易プレビューの 1 手順。card は止め絵（プロジェクトの frame 番目を 1 枚描いて durationFrames の間見せる）、
 * clip は動画を 1 本、最初から最後まで再生する。
 */
export type PreviewStep =
  | { kind: 'card'; itemId: string; label: string; frame: number; durationFrames: number }
  | { kind: 'clip'; itemId: string; label: string; durationFrames: number }

/**
 * つなげるのプロジェクトを、簡易プレビューの手順に直す（ADR 017 追記）。
 * 白フェードは出さない。表紙と終わりは、その素材の真ん中のフレームを 1 枚描いて見せる
 * （始まりのフレームだとテロップがまだフェードインの途中で薄い。真ん中なら文字は出きっていて、終わりは真っ白）。
 */
export function previewSteps(items: Project['items']): PreviewStep[] {
  const steps: PreviewStep[] = []
  let frame = 0
  let clipCount = 0
  for (const item of items) {
    if (item.kind === 'video') {
      clipCount += 1
      steps.push({
        kind: 'clip',
        itemId: item.itemId,
        label: `${clipCount} 本目`,
        durationFrames: item.durationFrames,
      })
    } else {
      steps.push({
        kind: 'card',
        itemId: item.itemId,
        label: frame === 0 ? '表紙' : '終わり',
        frame: frame + Math.floor(item.durationFrames / 2),
        durationFrames: item.durationFrames,
      })
    }
    frame += item.durationFrames
  }
  return steps
}
