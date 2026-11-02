import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The browser sees one origin in development, as it will in production.
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
})
