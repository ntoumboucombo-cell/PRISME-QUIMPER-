import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
// `base` configurable via la variable d'environnement BASE_PATH (utilisee par
// la CI pour un deploiement sous-chemin, ex. /bureau/). Defaut '/' (dev local).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
