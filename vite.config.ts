import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Setting base to './' makes all asset paths relative to the index.html file.
  // This prevents the app from looking at the domain root (/) for assets.
  base: './', 
})