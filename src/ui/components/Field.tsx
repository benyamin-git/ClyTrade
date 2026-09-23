import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-wide text-on-surface-variant uppercase"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  )
}
