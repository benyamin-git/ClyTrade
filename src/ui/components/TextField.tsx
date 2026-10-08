import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Field } from './Field'

export interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  error?: string | null
  disabled?: boolean
  hideLabel?: boolean
  className?: string
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  disabled,
  hideLabel,
  className,
}: TextFieldProps) {
  const id = useId()
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      {({ describedBy, invalid }) => (
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-control w-full rounded-app-sm border border-outline-variant bg-surface-container-lowest px-3 text-base transition-colors outline-none placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary',
            invalid && 'border-error focus:border-error focus:ring-error',
            disabled && 'opacity-50',
          )}
        />
      )}
    </Field>
  )
}
