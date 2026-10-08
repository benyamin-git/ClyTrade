import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly SegmentedControlOption<T>[]
  onChange: (value: T) => void
  size?: 'xs' | 'sm' | 'md'
  variant?: 'pill' | 'inline' | 'separated'
  fullWidth?: boolean
  ariaLabel?: string
  className?: string
}

const sizeClasses = {
  xs: 'h-8 px-2 text-2xs',
  sm: 'h-control px-3 text-xs',
  md: 'h-control px-4 text-sm',
} as const

const variantClasses = {
  pill: 'rounded-app-full border border-outline-variant bg-surface-container-lowest p-0.5',
  inline: 'rounded-app-sm bg-surface-container p-0.5',
} as const

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  variant = 'pill',
  fullWidth = false,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  if (variant === 'separated') {
    return (
      <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'state-layer inline-flex shrink-0 items-center justify-center rounded-app-full border font-medium whitespace-nowrap transition-colors',
                sizeClasses[size],
                active
                  ? 'border-transparent bg-secondary-container text-on-secondary-container'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  const activeIndex = options.findIndex((option) => option.value === value)

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = options.length
    if (count === 0) return
    const rtl = event.currentTarget.closest('[dir="rtl"]') !== null
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = rtl ? index - 1 : index + 1
        break
      case 'ArrowLeft':
        next = rtl ? index + 1 : index - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = count - 1
        break
      default:
        return
    }
    event.preventDefault()
    const wrapped = (next + count) % count
    const option = options[wrapped]
    if (!option) return
    onChange(option.value)
    tabRefs.current[wrapped]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={cn(
        'inline-flex items-center gap-0.5',
        fullWidth ? 'w-full flex-wrap' : 'w-fit shrink-0',
        variantClasses[variant],
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value
        const tabbable = active || (activeIndex === -1 && index === 0)
        return (
          <button
            key={option.value}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'state-layer font-medium whitespace-nowrap transition-colors',
              fullWidth && 'min-w-fit flex-1',
              variant === 'pill' ? 'rounded-app-full' : 'rounded-app-xs',
              sizeClasses[size],
              active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
