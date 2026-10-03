import { useId } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Checkbox({ label, checked, onChange, disabled, className }: CheckboxProps) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'group state-layer inline-flex h-control w-fit cursor-pointer items-center gap-2 rounded-app-sm px-2 text-sm text-on-surface select-none',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-app-xs border transition-colors group-focus-within:ring-2 group-focus-within:ring-primary group-focus-within:ring-offset-1 group-focus-within:ring-offset-surface',
          checked
            ? 'border-primary bg-primary text-on-primary'
            : 'border-outline bg-transparent',
        )}
      >
        {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
      <span>{label}</span>
    </label>
  )
}
