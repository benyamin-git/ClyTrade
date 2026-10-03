import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { Checkbox } from './Checkbox'
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
  className?: string
}

export function MultiSelectField({
  label,
  value,
  options,
  onChange,
  hint,
  disabled,
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
    <Field label={label} hint={hint} className={className}>
      <div
        role="group"
        aria-label={label}
        className={cn(
          'flex max-h-48 flex-col overflow-y-auto rounded-app-sm border border-outline-variant bg-surface-container-lowest p-1',
          disabled && 'opacity-50',
        )}
      >
        {options.length === 0 ? (
          <p
            aria-disabled="true"
            className="px-2 py-1.5 text-sm text-on-surface-variant opacity-50"
          >
            {t('filters.noOptions')}
          </p>
        ) : (
          options.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={value.includes(option.value)}
              onChange={() => toggle(option.value)}
              disabled={disabled}
              className="px-2"
            />
          ))
        )}
      </div>
    </Field>
  )
}
