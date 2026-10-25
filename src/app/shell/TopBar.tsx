import { Menu } from 'lucide-react'
import { useLocation } from 'react-router'
import { useUnreadAlertCount } from '@/features/alerts/logic/useUnreadAlertCount'
import { useI18n } from '@/i18n/I18nContext'
import { findTab } from '@/navigation/tabs'
import { IconButton } from '@/ui/components/IconButton'

export interface TopBarProps {
  title: string
  subtitle?: string
  onOpenNav: () => void
}

export function TopBar({ title, subtitle, onOpenNav }: TopBarProps) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const unreadCount = useUnreadAlertCount()
  const showUnread = unreadCount > 0 && findTab(pathname)?.id !== 'alerts'

  return (
    <header className="flex h-topbar-safe shrink-0 items-center gap-3 border-b border-outline-variant/60 bg-surface px-3 pt-safe-top sm:px-4">
      <IconButton label={t('shell.openNavigation')} onClick={onOpenNav}>
        <Menu />
      </IconButton>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          {showUnread ? (
            <span
              data-testid="alerts-unread-dot"
              aria-hidden="true"
              className="size-2 shrink-0 rounded-app-full bg-error"
            />
          ) : null}
        </div>
        {subtitle ? <p className="truncate text-xs text-on-surface-variant">{subtitle}</p> : null}
      </div>
    </header>
  )
}
