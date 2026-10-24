import '@fontsource-variable/roboto'
import '@fontsource-variable/vazirmatn'
import '@/styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRoot } from '@/app/AppRoot'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { lockZoom } from '@/lib/zoom'
import { ThemeProvider } from '@/theme/ThemeProvider'

lockZoom()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <AppRoot />
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
)
