import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Explicitly set the base URL to the GitHub repository name.
  // This ensures assets (js, css, images) are loaded from /Material-Dither/ instead of root /.
  base: '/Material-Dither/', 
})