import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pagesのベースパス設定
  // リポジトリ名が 'KurotoriVRMWebViewer' の場合のパス設定
  base: '/KurotoriVRMWebViewer/',
  
  // ビルド設定
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // GitHub Pagesでの動作を最適化
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  
  // 開発サーバー設定
  server: {
    host: true,
    port: 3000,
  },
  
  // プレビューサーバー設定
  preview: {
    host: true,
    port: 4173,
  },
}) 