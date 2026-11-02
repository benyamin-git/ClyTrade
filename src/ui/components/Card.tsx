import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  actions?: ReactNode
}

export function Card({ title, actions, className, children, ...props }: CardProps) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-app-md border border-outline-variant/60 bg-surface-container-low',
        className,
      )}
      {...props}
    >
      {title ? (
        <header className="flex min-h-12 shrink-0 items-center gap-3 border-b border-outline-variant/50 px-4 py-2">
          <h2 className="min-w-0 truncate text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
            {title}
          </h2>
          {actions ? (
            <div className="ms-auto flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}
