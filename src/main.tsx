import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import '@fontsource/poppins/600.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')
if (root === null) throw new Error('#root manquant')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
