import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages では https://<user>.github.io/groupe-vlog/ で配信されるので base を合わせる。
// basicSsl は LAN 上のスマホから HTTPS で開発サーバーに接続するため（WebCodecs と共有機能は HTTPS が必須）。
// PC の http://localhost は HTTPS 無しでも secure context 扱いなので、NO_SSL=1 で無効にできる（自動テスト用）。
const useSsl = process.env.NO_SSL !== '1'

export default defineConfig({
  base: '/groupe-vlog/',
  plugins: [react(), tailwindcss(), ...(useSsl ? [basicSsl()] : [])],
  server: { host: true },
})
