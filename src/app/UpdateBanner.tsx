import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/ui/components/Button'

export function UpdateBanner() {
  const { t } = useI18n()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <output className="fixed inset-x-4 bottom-[calc(var(--spacing-safe-bottom)+1rem)] z-40 mx-auto flex max-w-md items-center gap-3 rounded-app-lg bg-primary-container py-3 pe-3 ps-4 text-on-primary-container">
      <span className="flex-1 text-sm">{t('update.available')}</span>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        {t('update.reload')}
      </Button>
      <Button
        size="sm"
        variant="text"
        className="text-on-primary-container!"
        onClick={() => setNeedRefresh(false)}
      >
        {t('update.dismiss')}
      </Button>
    </output>
  )
}
