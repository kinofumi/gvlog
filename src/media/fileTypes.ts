/** 動画かどうか。type が空のとき（一部の Android）は拡張子で見る */
export function isVideoFile(file: { type: string; name: string }): boolean {
  return file.type.startsWith('video/') || /\.(mp4|mov|m4v)$/i.test(file.name)
}
