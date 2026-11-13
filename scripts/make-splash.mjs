// 仮のスプラッシュ画像（1080x1920 PNG）を @napi-rs/canvas（devDependency）で作る（ADR 021）。
// 使い方: プロジェクト直下で `node scripts/make-splash.mjs public/splash.png`
// 本番の画像（チラシの表面、public/splash.jpg）に差し替えたので、このスクリプトはもう使わない。仮の画像の作り方の記録として残す
import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync } from 'node:fs'
const W = 1080, H = 1920
const c = createCanvas(W, H)
const ctx = c.getContext('2d')
const g = ctx.createLinearGradient(0, 0, 0, H)
g.addColorStop(0, '#dbeafe')
g.addColorStop(1, '#1d4ed8')
ctx.fillStyle = g
ctx.fillRect(0, 0, W, H)
ctx.fillStyle = '#ffffff'
ctx.textAlign = 'center'
ctx.font = 'bold 120px "Hiragino Sans", sans-serif'
ctx.fillText('イベント名（仮）', W / 2, H / 2 - 80)
ctx.font = '56px "Hiragino Sans", sans-serif'
ctx.fillText('この画像はあとで差し替えます', W / 2, H / 2 + 60)
ctx.font = '40px "Hiragino Sans", sans-serif'
ctx.fillText('public/splash.png', W / 2, H / 2 + 140)
writeFileSync(process.argv[2], c.toBuffer('image/png'))
