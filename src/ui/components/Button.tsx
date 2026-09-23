import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger'
type ButtonSize = 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary',
  tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline text-on-surface',
  text: 'text-primary',
  danger: 'bg-error-container text-on-error-container',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 gap-2 px-4 text-xs',
  md: 'h-control gap-2 px-5 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function Button({
  variant = 'filled',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'state-layer inline-flex shrink-0 items-center justify-center rounded-app-full font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {icon ? <span className="[&>svg]:size-4">{icon}</span> : null}
      {children}
    </button>
  )
}
