import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MobileNotice } from './components/ui/MobileNotice'
import { isMobileDevice } from './utils/device'

// Checked before the app mounts, so phones never connect or load the theatre.
createRoot(document.getElementById('root')!).render(
  <StrictMode>{isMobileDevice() ? <MobileNotice /> : <App />}</StrictMode>,
)
