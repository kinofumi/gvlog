import { defineConfig } from 'vitest/config'

// 純粋関数のテスト。ブラウザ API に触るモジュールはここではテストしない。
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
