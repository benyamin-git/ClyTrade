import { Menu } from 'lucide-react'
import { IconButton } from '@/ui/components/IconButton'

export interface TopBarProps {
  title: string
  subtitle?: string
  onOpenNav: () => void
}

export function TopBar({ title, subtitle, onOpenNav }: TopBarProps) {
  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-outline-variant/60 bg-surface px-3 sm:px-4">
      <IconButton label="Open navigation" onClick={onOpenNav}>
        <Menu />
      </IconButton>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-on-surface-variant">{subtitle}</p> : null}
      </div>
    </header>
  )
}
