import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const isAdminRoute =
  path === '/became-admin' ||
  path.startsWith('/became-admin/') ||
  path === '/admin-panel' ||
  path.startsWith('/admin-panel/')

async function boot() {
  if (isAdminRoute) {
    const { default: AdminBrowserApp } = await import('./AdminBrowserApp')
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AdminBrowserApp />
      </StrictMode>,
    )
    return
  }
  const { default: App } = await import('./App')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot()
