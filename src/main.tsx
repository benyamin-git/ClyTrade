import '@fontsource-variable/roboto'
import '@/styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from '@/app/router'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
)
