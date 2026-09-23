import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center',
        className,
      )}
    >
      {icon ? <div className="text-on-surface-variant [&>svg]:size-10">{icon}</div> : null}
      <p className="text-base font-medium text-on-surface">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-on-surface-variant">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
