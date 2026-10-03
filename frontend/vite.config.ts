import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute base so /became-admin/ and other deep routes load /assets/* correctly
export default defineConfig({
  plugins: [react()],
  base: '/',
})
