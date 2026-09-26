import { useEffect } from 'react'
import { NavLink } from 'react-router'
import { X } from 'lucide-react'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { tabs } from '@/navigation/tabs'
import { IconButton } from '@/ui/components/IconButton'

export interface NavDrawerProps {
  open: boolean
  onClose: () => void
}

export function NavDrawer({ open, onClose }: NavDrawerProps) {
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <div className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')} aria-hidden={!open}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('shell.closeNavigation')}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-scrim/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <nav
        aria-label={t('shell.mainNavigation')}
        className={cn(
          'absolute inset-y-0 start-0 flex w-72 flex-col border-s border-outline-variant/60 bg-surface-container-low shadow-2xl transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        )}
      >
        <div className="flex h-topbar shrink-0 items-center justify-between border-b border-outline-variant/50 px-4">
          <span className="text-base font-semibold">ClyTrade</span>
          <IconButton label={t('shell.closeNavigation')} onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <ul className="flex flex-col gap-1 p-3">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <NavLink
                to={tab.subtabs[0]?.path ?? tab.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'state-layer flex h-control-touch items-center gap-3 rounded-app-full px-4 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )
                }
              >
                <tab.icon className="size-5 shrink-0" />
                {t(tab.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="mt-auto p-4 text-xs text-on-surface-variant">{t('shell.tagline')}</p>
      </nav>
    </div>
  )
}
