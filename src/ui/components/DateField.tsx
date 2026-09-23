import { useId } from 'react'
import { Field } from './Field'

export interface DateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  className?: string
}

export function DateField({ label, value, onChange, hint, className }: DateFieldProps) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} className={className}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-control w-full rounded-app-sm border border-outline-variant bg-surface-container-lowest px-3 text-base transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </Field>
  )
}
