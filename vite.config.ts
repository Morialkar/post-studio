import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relative : le site marche sous n'importe quel chemin GitHub Pages (/post-studio/ ou domaine propre).
export default defineConfig({
  base: './',
  plugins: [react()],
})
