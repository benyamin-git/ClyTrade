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
  return value === null || !Number.isFinite(value) ? '' : String(value)
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
  const [lastValue, setLastValue] = useState(value)
  const [lastUnit, setLastUnit] = useState(unitValue)

  if (value !== lastValue) {
    setLastValue(value)
    if (parseNumberInput(raw) !== value) setRaw(toRaw(value))
  }

  if (unitValue !== lastUnit) {
    setLastUnit(unitValue)
    setRaw(toRaw(value))
  }

  const currentUnit = unitOptions?.find((option) => option.value === unitValue)
  const nextUnit = unitOptions?.find((option) => option.value !== unitValue)
  const unitToggle =
    unitOptions?.length === 2 && unitValue && onUnitChange && currentUnit && nextUnit
      ? { current: currentUnit, next: nextUnit, onChange: onUnitChange }
      : null
  const unitToggleLabel = currentUnit
    ? t('common.unitToggle', { label, unit: currentUnit.label })
    : undefined

  function handleBlur() {
    const parsed = parseNumberInput(raw)
    if (parsed === null) {
      setRaw(toRaw(value))
      return
    }
    const clamped = clamp(parsed, min ?? -Infinity, max ?? Infinity)
    setRaw(toRaw(clamped))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={className}>
      {({ describedBy, invalid }) => (
        <div
          className={cn(
            'relative flex h-control items-center gap-2 rounded-app-sm border border-outline-variant bg-surface-container-lowest transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
            !unitToggle && 'px-3',
            invalid && 'border-error focus-within:border-error focus-within:ring-error',
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
            aria-describedby={describedBy}
            aria-invalid={invalid ? true : undefined}
            onChange={(event) => {
              const next = event.target.value
              setRaw(next)
              onChange(parseNumberInput(next))
            }}
            onBlur={handleBlur}
            onFocus={(event) => event.target.select()}
            className={cn(
              'tabular w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-variant',
              unitToggle && 'ps-3 pe-[calc(var(--spacing-control)+0.75rem)]',
            )}
          />
          {unitToggle ? (
            <button
              type="button"
              disabled={disabled}
              aria-label={unitToggleLabel}
              title={unitToggleLabel}
              onClick={() => unitToggle.onChange(unitToggle.next.value)}
              className="state-layer absolute inset-y-0 end-0 flex w-control items-center justify-center rounded-e-app-sm text-xs font-medium text-on-surface-variant disabled:pointer-events-none"
            >
              {unitToggle.current.label}
            </button>
          ) : unitOptions && unitValue && onUnitChange ? (
            <SegmentedControl
              value={unitValue}
              options={unitOptions}
              onChange={onUnitChange}
              size="sm"
              ariaLabel={unitToggleLabel}
            />
          ) : unit ? (
            <span className="shrink-0 text-xs text-on-surface-variant">{unit}</span>
          ) : null}
        </div>
      )}
    </Field>
  )
}
