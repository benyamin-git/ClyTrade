import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { NumberField } from './NumberField'

export interface RangeFieldProps {
  label: string
  value: { min: number | null; max: number | null }
  onChange: (value: { min: number | null; max: number | null }) => void
  min: number
  max: number
  format?: (value: number) => string
  disabled?: boolean
  hint?: string
  className?: string
}

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  format,
  disabled,
  hint,
  className,
}: RangeFieldProps) {
  const { t } = useI18n()
  const degenerate = max <= min
  const isDisabled = Boolean(disabled) || degenerate

  const lower = value.min
  const upper = value.max
  const [minKey, setMinKey] = useState(0)
  const [maxKey, setMaxKey] = useState(0)
  const emittedMin = useRef(lower)
  const emittedMax = useRef(upper)

  useEffect(() => {
    if (lower !== emittedMin.current) {
      emittedMin.current = lower
      setMinKey((current) => current + 1)
    }
  }, [lower])

  useEffect(() => {
    if (upper !== emittedMax.current) {
      emittedMax.current = upper
      setMaxKey((current) => current + 1)
    }
  }, [upper])

  function changeMin(next: number | null) {
    emittedMin.current = next
    onChange({ min: next, max: upper })
  }

  function changeMax(next: number | null) {
    emittedMax.current = next
    onChange({ min: lower, max: next })
  }

  const hintText = hint ?? (degenerate ? t('filters.degenerateRange') : undefined)
  const minPlaceholder = format ? format(min) : undefined
  const maxPlaceholder = format ? format(max) : undefined

  return (
    <Field label={label} hint={hintText} className={className}>
      {({ labelId }) => (
        <div
          role="group"
          aria-labelledby={labelId}
          className={cn('flex gap-2', isDisabled && 'opacity-50')}
        >
          <NumberField
            key={`min-${minKey}`}
            label={t('filters.min')}
            value={lower}
            onChange={changeMin}
            disabled={isDisabled}
            placeholder={minPlaceholder}
            className="flex-1"
          />
          <NumberField
            key={`max-${maxKey}`}
            label={t('filters.max')}
            value={upper}
            onChange={changeMax}
            disabled={isDisabled}
            placeholder={maxPlaceholder}
            className="flex-1"
          />
        </div>
      )}
    </Field>
  )
}
