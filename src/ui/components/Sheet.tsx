import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { IconButton } from './IconButton'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Sheet({ open, onClose, title, children, footer, className }: SheetProps) {
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label={t('common.closeDialog')}
        onClick={onClose}
        className="absolute inset-0 bg-scrim/50 backdrop-blur-[2px]"
      />
      <div
        className={cn(
          'relative flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-app-lg border border-outline-variant/60 bg-surface-container-high shadow-2xl sm:rounded-app-lg',
          className,
        )}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant/50 px-4">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <IconButton label={t('common.close')} onClick={onClose}>
            <X />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-outline-variant/50 p-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
