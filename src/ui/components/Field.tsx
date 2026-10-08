import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldControlProps {
  describedBy?: string
  invalid: boolean
  labelId: string
}

export interface FieldProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  hideLabel?: boolean
  className?: string
  children: ReactNode | ((control: FieldControlProps) => ReactNode)
}

export function Field({ label, htmlFor, hint, error, hideLabel, className, children }: FieldProps) {
  const id = useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined
  const invalid = Boolean(error)
  const content =
    typeof children === 'function' ? children({ describedBy, invalid, labelId }) : children

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        id={labelId}
        htmlFor={htmlFor}
        className={cn(
          'font-medium tracking-wide text-on-surface-variant uppercase',
          hideLabel ? 'sr-only' : 'text-xs',
        )}
      >
        {label}
      </label>
      {content}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
