import { buildFileName } from '../export/naming'
import { useAppStore } from '../state/store'
import { ExportPanel } from './ExportPanel'
import { TotalDuration } from './TotalDuration'

/** 編集タブの書き出し: store のプロジェクトと素材を ExportPanel につなぐ。合計と上限の注意も出す */
export function EditorExport() {
  const project = useAppStore((s) => s.project)
  const images = useAppStore((s) => s.images)
  const videos = useAppStore((s) => s.videos)
  return (
    <>
      {project.items.length > 0 && <TotalDuration />}
      <ExportPanel
        project={project}
        images={images}
        videos={videos}
        fileName={buildFileName([project.preset.name])}
      />
    </>
  )
}
