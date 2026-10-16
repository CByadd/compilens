import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // local dev: Flask runs on :5000 (flask --app api/index run); on Vercel /api is the same origin
  server: { proxy: { '/api': 'http://127.0.0.1:5000' } },
})
