import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./Localization/i18n.tsx";

// This app has no service worker. One left in a browser by an older build would
// keep serving old files until a hard refresh, so drop any that are registered.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
