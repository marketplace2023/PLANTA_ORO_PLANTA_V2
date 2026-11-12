import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@fur-lulo': path.resolve(import.meta.dirname, '../PLANTA_ORO_WEB_V2/apps/web/src/features/lulo'),
      '@fur-lulo-style': path.resolve(import.meta.dirname, '../PLANTA_ORO_WEB_V2/apps/web/src/styles/lulo-workspace.css'),
    },
    dedupe: ['react', 'react-dom', '@tanstack/react-query', 'react-router-dom', 'sonner', 'lucide-react'],
  },
  server: {
    port: 5174,
    fs: { allow: [path.resolve(import.meta.dirname, '..')] },
    // En desarrollo el navegador habla con este mismo origen y Vite reenvía /api a la API: sin CORS que configurar.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    // Los tests corren en Node: necesitan una URL absoluta (en el navegador se usa el proxy /api).
    env: { VITE_API_URL: 'http://localhost:3000/api/v1' },
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Formularios con muchas interacciones (userEvent) tardan más de 5 s cuando varios archivos corren en paralelo.
    testTimeout: 20_000,
  },
})
