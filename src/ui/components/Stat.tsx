import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type StatTone = 'default' | 'profit' | 'loss' | 'warning' | 'primary'

const toneClasses: Record<StatTone, string> = {
  default: 'text-on-surface',
  profit: 'text-profit',
  loss: 'text-loss',
  warning: 'text-warning',
  primary: 'text-primary',
}

export interface StatProps {
  label: string
  value: ReactNode
  tone?: StatTone
  hint?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Stat({ label, value, tone = 'default', hint, size = 'md', className }: StatProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
        {label}
      </span>
      <span
        className={cn(
          'tabular truncate font-semibold',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-2xl',
          toneClasses[tone],
        )}
      >
        {value}
      </span>
      {hint ? <span className="truncate text-xs text-on-surface-variant">{hint}</span> : null}
    </div>
  )
}
