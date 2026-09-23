import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
}

export function Card({ title, className, children, ...props }: CardProps) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col rounded-app-md border border-outline-variant/60 bg-surface-container-low',
        className,
      )}
      {...props}
    >
      {title ? (
        <header className="flex h-12 shrink-0 items-center border-b border-outline-variant/50 px-4">
          <h2 className="text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
            {title}
          </h2>
        </header>
      ) : null}
      {children}
    </section>
  )
}
