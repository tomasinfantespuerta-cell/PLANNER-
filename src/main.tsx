import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Service worker: la app abre sin conexión y se actualiza sola.
registerSW({ immediate: true })

// Pedimos al navegador que no borre nuestros datos locales si anda justo de espacio.
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(<App />)
