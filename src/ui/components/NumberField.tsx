import { useId, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { clamp } from '@/lib/money'
import { parseNumberInput } from '@/lib/format'
import { Field } from './Field'
import { SegmentedControl } from './SegmentedControl'

export interface NumberUnitOption {
  value: string
  label: string
}

export interface NumberFieldProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  unit?: string
  unitOptions?: readonly NumberUnitOption[]
  unitValue?: string
  onUnitChange?: (value: string) => void
  placeholder?: string
  hint?: string
  error?: string | null
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

function toRaw(value: number | null): string {
  return value === null ? '' : String(value)
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  unitOptions,
  unitValue,
  onUnitChange,
  placeholder,
  hint,
  error,
  min,
  max,
  disabled,
  className,
}: NumberFieldProps) {
  const { t } = useI18n()
  const id = useId()
  const [raw, setRaw] = useState(() => toRaw(value))
  const [lastUnit, setLastUnit] = useState(unitValue)

  if (unitValue !== lastUnit) {
    setLastUnit(unitValue)
    setRaw(toRaw(value))
  }

  function handleBlur() {
    const parsed = parseNumberInput(raw)
    if (parsed === null) return
    const clamped = clamp(parsed, min ?? -Infinity, max ?? Infinity)
    setRaw(toRaw(clamped))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={className}>
      <div
        className={cn(
          'flex h-control items-center gap-2 rounded-app-sm border border-outline-variant bg-surface-container-lowest px-3 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
          error && 'border-error focus-within:border-error focus-within:ring-error',
          disabled && 'opacity-50',
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          disabled={disabled}
          value={raw}
          placeholder={placeholder}
          onChange={(event) => {
            const next = event.target.value
            setRaw(next)
            onChange(parseNumberInput(next))
          }}
          onBlur={handleBlur}
          onFocus={(event) => event.target.select()}
          className="tabular w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-variant/50"
        />
        {unitOptions && unitValue && onUnitChange ? (
          <SegmentedControl
            value={unitValue}
            options={unitOptions}
            onChange={onUnitChange}
            size="xs"
            variant="inline"
            ariaLabel={t('common.unitAria', { label })}
          />
        ) : unit ? (
          <span className="shrink-0 text-xs text-on-surface-variant">{unit}</span>
        ) : null}
      </div>
    </Field>
  )
}
