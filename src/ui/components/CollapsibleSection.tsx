import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface CollapsibleSectionProps {
  title: string
  count?: number
  defaultOpen?: boolean
  autoOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  autoOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: CollapsibleSectionProps) {
  const id = useId()
  const [internalOpen, setInternalOpen] = useState(defaultOpen || autoOpen)
  const controlled = controlledOpen !== undefined
  const open = controlled ? controlledOpen : internalOpen
  const panelId = `${id}-panel`

  function toggle() {
    const next = !open
    if (!controlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
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
