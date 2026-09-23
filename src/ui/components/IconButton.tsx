import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md'
}

export function IconButton({
  label,
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'state-layer inline-flex shrink-0 items-center justify-center rounded-app-full text-on-surface-variant transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-40 [&>svg]:size-5',
        size === 'sm' ? 'size-9 [&>svg]:size-4' : 'size-control',
        className,
      )}
      {...props}
    />
  )
}
