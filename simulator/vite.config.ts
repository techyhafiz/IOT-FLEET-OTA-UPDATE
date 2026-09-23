import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: '/simulator/',
  plugins: [react(), tailwindcss()],
  server: { port: 3000 },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      '@wokwi/elements': path.resolve(__dirname, './node_modules/@wokwi/elements'),
    },
    dedupe: ['react', 'react-dom'],
  },
})
