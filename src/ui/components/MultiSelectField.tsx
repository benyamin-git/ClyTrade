import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { Field } from './Field'

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectFieldProps {
  label: string
  value: readonly string[]
  options: readonly MultiSelectOption[]
  onChange: (value: string[]) => void
  hint?: string
  disabled?: boolean
  hideLabel?: boolean
  className?: string
}

export function MultiSelectField({
  label,
  value,
  options,
  onChange,
  hint,
  disabled,
  hideLabel,
  className,
}: MultiSelectFieldProps) {
  const { t } = useI18n()

  function toggle(optionValue: string) {
    const selected = new Set(value)
    if (selected.has(optionValue)) {
      selected.delete(optionValue)
    } else {
      selected.add(optionValue)
    }
    onChange(options.filter((option) => selected.has(option.value)).map((option) => option.value))
  }

  return (
    <Field label={label} hint={hint} hideLabel={hideLabel} className={className}>
      <div
        role="group"
        aria-label={label}
        className={cn('flex flex-wrap gap-2', disabled && 'opacity-50')}
      >
        {options.length === 0 ? (
          <p aria-disabled="true" className="text-sm text-on-surface-variant opacity-50">
            {t('filters.noOptions')}
          </p>
        ) : (
          options.map((option) => {
            const active = value.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => toggle(option.value)}
                className={cn(
                  'state-layer inline-flex shrink-0 items-center justify-center rounded-app-full border font-medium whitespace-nowrap transition-colors',
                  'h-9 px-4 text-sm',
                  active
                    ? 'border-transparent bg-secondary-container text-on-secondary-container'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant',
                )}
              >
                {option.label}
              </button>
            )
          })
        )}
      </div>
    </Field>
  )
}
