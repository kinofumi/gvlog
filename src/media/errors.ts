/** 利用者に見せるメッセージを持つエラー */
export class MediaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaError'
  }
}
