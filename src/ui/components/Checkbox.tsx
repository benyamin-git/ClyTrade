import { useId } from 'react'
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
        'inline-flex h-control w-fit cursor-pointer items-center gap-2 text-sm text-on-surface select-none',
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
        className="size-4 shrink-0 accent-primary"
      />
      <span>{label}</span>
    </label>
  )
}
