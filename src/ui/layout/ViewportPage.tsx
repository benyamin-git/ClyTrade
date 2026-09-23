import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ViewportPageProps {
  children: ReactNode
  className?: string
}

export function ViewportPage({ children, className }: ViewportPageProps) {
  return <div className={cn('flex h-full min-h-0 flex-col p-4 sm:p-6', className)}>{children}</div>
}
