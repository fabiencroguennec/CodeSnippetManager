import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/CodeSnippetManager/', // ← IMPORTANT: nom de votre repository
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})