import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface CollapsibleSectionProps {
  title: string
  count?: number
  defaultOpen?: boolean
  autoOpen?: boolean
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  autoOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const id = useId()
  const [open, setOpen] = useState(defaultOpen || autoOpen)
  const panelId = `${id}-panel`

  return (
    <div className={cn('flex flex-col', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="state-layer flex h-control w-full items-center gap-2 rounded-app-sm px-2 text-start text-sm font-medium text-on-surface transition-colors"
      >
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
        <span className="flex-1 truncate">{title}</span>
        {count !== undefined && count > 0 ? (
          <span className="shrink-0 rounded-app-full bg-secondary-container px-2 py-0.5 text-xs font-medium text-on-secondary-container tabular-nums">
            {count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div id={panelId} className="flex flex-col">
          {children}
        </div>
      ) : null}
    </div>
  )
}
