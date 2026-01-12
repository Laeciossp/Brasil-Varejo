import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Força o Vite a processar estas bibliotecas juntas
    include: ['react', 'react-dom', '@clerk/clerk-react'],
  },
})