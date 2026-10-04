import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // "@/..." apunta a la carpeta src/, para no escribir rutas como "../../../"
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
