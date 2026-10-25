import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { updatePreferences } from '@/data/repositories/settings.repo'
import { useI18n } from '@/i18n/I18nContext'
import { APP_PLATFORM } from '@/lib/version'
import { Button } from '@/ui/components/Button'
import { Sheet } from '@/ui/components/Sheet'

type WindowsCloseChoice = 'tray' | 'quit'

export function WindowsClosePrompt() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (APP_PLATFORM !== 'windows') return
    let disposed = false
    let unlisten: (() => void) | null = null
    void listen('windows-close-prompt', () => setOpen(true))
      .then((stop) => {
        if (disposed) {
          stop()
          return
        }
        unlisten = stop
      })
      .catch(() => undefined)
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [])

  const choose = useCallback(async (behavior: WindowsCloseChoice) => {
    setBusy(true)
    try {
      await updatePreferences({ windowsCloseBehavior: behavior })
      await invoke('resolve_windows_close', { behavior })
      setOpen(false)
    } catch {
      setBusy(false)
    }
  }, [])

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title={t('windowsClose.title')}
      footer={
        <>
          <Button onClick={() => void choose('tray')} disabled={busy}>
            {t('windowsClose.hide')}
          </Button>
          <Button variant="outlined" onClick={() => void choose('quit')} disabled={busy}>
            {t('windowsClose.quit')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-on-surface-variant">{t('windowsClose.body')}</p>
    </Sheet>
  )
}
