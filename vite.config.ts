import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// 版の番号は package.json の version が元（ADR 025）。ビルド時に __APP_VERSION__ に埋め込み、スプラッシュに出す
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

// GitHub Pages では https://<user>.github.io/gvlog/ で配信されるので base を合わせる。
// basicSsl は LAN 上のスマホから HTTPS で開発サーバーに接続するため（WebCodecs と共有機能は HTTPS が必須）。
// PC の http://localhost は HTTPS 無しでも secure context 扱いなので、NO_SSL=1 で無効にできる（自動テスト用）。
const useSsl = process.env.NO_SSL !== '1'

export default defineConfig({
  base: '/gvlog/',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), tailwindcss(), ...(useSsl ? [basicSsl()] : [])],
  server: { host: true },
})
