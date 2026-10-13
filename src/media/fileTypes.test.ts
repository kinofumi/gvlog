import { describe, expect, it } from 'vitest'
import { isVideoFile } from './fileTypes'

describe('isVideoFile', () => {
  it('MIME が video/ なら動画', () => {
    expect(isVideoFile({ type: 'video/quicktime', name: 'IMG_0001.MOV' })).toBe(true)
    expect(isVideoFile({ type: 'image/jpeg', name: 'IMG_0001.JPG' })).toBe(false)
  })

  it('MIME が空なら拡張子（mp4 / mov / m4v、大文字可）で見る', () => {
    expect(isVideoFile({ type: '', name: 'clip.MP4' })).toBe(true)
    expect(isVideoFile({ type: '', name: 'clip.m4v' })).toBe(true)
    expect(isVideoFile({ type: '', name: 'photo.heic' })).toBe(false)
  })
})
