import type { GroupPreset } from './types'

/** 既定のプリセット: 縦型 1080x1920、30fps、10 秒 */
export const DEFAULT_PRESET: GroupPreset = {
  id: 'default',
  name: 'Vlog',
  aspect: '9:16',
  width: 1080,
  height: 1920,
  fps: 30,
  totalFrames: 300,
}
