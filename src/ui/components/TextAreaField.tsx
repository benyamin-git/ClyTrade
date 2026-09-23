import { useId } from 'react'
import { Field } from './Field'

export interface TextAreaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: TextAreaFieldProps) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} className={className}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-app-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-base transition-colors outline-none placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </Field>
  )
}
