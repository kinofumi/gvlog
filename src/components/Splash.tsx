import { useEffect, useRef, useState } from 'react'

/** 表紙の画像（イベントのチラシの表面、docs/nakaminato001.jpg を幅 1080 に縮めた JPEG）。public/splash.jpg を差し替えるだけで変えられる（Pages のサブパスにも対応） */
const SPLASH_SRC = `${import.meta.env.BASE_URL}splash.jpg`
/** 画像が出てから、自動で消え始めるまでの時間 */
const SHOW_MS = 2000
/** 薄くなって消えるまでの時間（下の duration-300 と合わせる） */
const FADE_MS = 300

/**
 * 起動時の表紙（スプラッシュ、ADR 021）: アプリの画面の上に、イベントの画像を画面いっぱいに 2 秒ほど見せてから薄くなって消える。
 * 待ちたくない人はどこをタップしても消せる。開くたびに毎回出す（当日は開き直すことが多く、1 回だけにすると説明と食い違うため）。
 * 2 秒は画像が出てから数える（index.html の先読みで取得は早く始まるが、遅い回線では JS より後に届くこともある）。
 * 画像が読めなければすぐ消える。表示中は App が裏の画面を inert にして、タブやリンクにフォーカスが行かないようにする。
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [fading, setFading] = useState(false)
  // onDone は App が描画のたびに作り直すので、effect の依存に入れるとフェードのたびにタイマーが引き直される（消えるのが延びる）。
  // そこで最新の onDone を ref に入れておき、タイマーは fading が true になったときの 1 回だけにする
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  // 画像が出たら時間を数え始め、きたら消え始める。タップで先に消え始めていたら setFading(true) は変化なし
  useEffect(() => {
    if (!loaded) return
    const timer = setTimeout(() => setFading(true), SHOW_MS)
    return () => clearTimeout(timer)
  }, [loaded])

  // 薄くなり終わったら外す（transitionend は届かないことがあるので、時間で区切る）
  useEffect(() => {
    if (!fading) return
    const timer = setTimeout(() => onDoneRef.current(), FADE_MS)
    return () => clearTimeout(timer)
  }, [fading])

  return (
    <button
      type="button"
      aria-label="表紙を閉じる"
      // 開いた直後のフォーカスをここに置く（キーボードや VoiceOver でも Enter やダブルタップで閉じられる）
      autoFocus
      // 消えている途中（透明）はタップを通す（下のタブを押したのに吸い込まれないように）。touch-none で裏のページがスクロールしないようにする
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none touch-none bg-white transition-opacity duration-300 motion-reduce:transition-none ${fading ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      onClick={() => setFading(true)}
    >
      <img
        src={SPLASH_SRC}
        alt=""
        // 画像はタップを受けない（長押しの「画像を保存」やドラッグが出ないように。タップは button が受ける）
        // flex-1 + min-h-0 で、下の「タップで始める」の分だけ縮む（重ねると横長の画面でチラシの文字にかぶる）
        className="pointer-events-none min-h-0 w-full flex-1 object-contain"
        draggable={false}
        onLoad={() => setLoaded(true)}
        // 画像が無い・壊れているときは待たずに消える（白い画面を 2 秒見せない）
        onError={() => setFading(true)}
      />
      <span className="shrink-0 py-4 text-xs text-stone-600">タップで始める</span>
    </button>
  )
}
