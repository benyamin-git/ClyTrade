import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Field } from './Field'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

export interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  hint?: string
  disabled?: boolean
  className?: string
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  disabled,
  className,
}: SelectFieldProps<T>) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} className={className}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn(
          'h-control w-full rounded-app-sm border border-outline-variant bg-surface-container-lowest px-3 text-base transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary',
          disabled && 'opacity-50',
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
