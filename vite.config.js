import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  // Served from the root of volunteerhub.northstarhouse.org (a GitHub Pages
  // custom domain), not the /volunteerhub/ project subpath.
  base: '/',
})
