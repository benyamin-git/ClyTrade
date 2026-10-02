import { useId, useState } from 'react'
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
  placeholder?: string
  hint?: string
  disabled?: boolean
  className?: string
}

export function MultiSelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  hint,
  disabled,
  className,
}: MultiSelectFieldProps) {
  const { t } = useI18n()
  const id = useId()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const visibleOptions = normalizedQuery
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : options

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
    <Field label={label} htmlFor={id} hint={hint} className={className}>
      <div className="flex flex-col gap-1.5">
        <input
          id={id}
          type="search"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(event) => setQuery(event.target.value)}
          className={cn(
            'h-control w-full rounded-app-sm border border-outline-variant bg-surface-container-lowest px-3 text-base transition-colors outline-none placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary',
            disabled && 'opacity-50',
          )}
        />
        <div
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
            visibleOptions.map((option) => (
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
      </div>
    </Field>
  )
}
