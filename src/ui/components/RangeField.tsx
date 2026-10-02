import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { effectiveBounds, positionToValue, valueToPosition, type RangeScale } from '@/lib/range'
import { Field } from './Field'
import { NumberField } from './NumberField'

export interface RangeFieldProps {
  label: string
  value: { min: number | null; max: number | null }
  onChange: (value: { min: number | null; max: number | null }) => void
  min: number
  max: number
  scale?: RangeScale
  format?: (value: number) => string
  step?: number
  disabled?: boolean
  hint?: string
  className?: string
}

const sliderClasses = cn(
  'pointer-events-none absolute inset-x-0 h-control w-full appearance-none bg-transparent',
  '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent',
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-app-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface',
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-app-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface',
)

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  scale = 'linear',
  format,
  step,
  disabled,
  hint,
  className,
}: RangeFieldProps) {
  const { t } = useI18n()
  const bounds = effectiveBounds(min, max, scale)
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

  const minPosition = valueToPosition(lower ?? bounds.min, bounds.min, bounds.max, scale)
  const maxPosition = valueToPosition(upper ?? bounds.max, bounds.min, bounds.max, scale)

  function snap(next: number): number {
    if (step === undefined || step <= 0) return next
    return Math.round(next / step) * step
  }

  function changeMin(next: number | null) {
    emittedMin.current = next
    onChange({ min: next, max: upper })
  }

  function changeMax(next: number | null) {
    emittedMax.current = next
    onChange({ min: lower, max: next })
  }

  function slideMin(position: number) {
    const next = snap(positionToValue(position, bounds.min, bounds.max, scale))
    const bounded = upper === null ? next : Math.min(next, upper)
    onChange({ min: next <= bounds.min ? null : bounded, max: upper })
  }

  function slideMax(position: number) {
    const next = snap(positionToValue(position, bounds.min, bounds.max, scale))
    const bounded = lower === null ? next : Math.max(next, lower)
    onChange({ min: lower, max: next >= bounds.max ? null : bounded })
  }

  const formatValue = (bound: number) => (format ? format(bound) : String(bound))
  const hintText = hint ?? (degenerate ? t('filters.degenerateRange') : undefined)

  return (
    <Field label={label} hint={hintText} className={className}>
      <div className={cn('flex flex-col gap-2', isDisabled && 'opacity-50')}>
        <div dir="ltr" className="flex flex-col gap-1">
          <div className="relative flex h-control items-center">
            <div className="pointer-events-none absolute inset-x-0 h-1 rounded-app-full bg-surface-container-highest" />
            <div
              className="pointer-events-none absolute h-1 rounded-app-full bg-primary"
              style={{
                insetInlineStart: `${minPosition * 100}%`,
                insetInlineEnd: `${(1 - maxPosition) * 100}%`,
              }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step="any"
              value={minPosition}
              disabled={isDisabled}
              aria-label={t('filters.min')}
              onChange={(event) => slideMin(Number(event.target.value))}
              className={sliderClasses}
            />
            <input
              type="range"
              min={0}
              max={1}
              step="any"
              value={maxPosition}
              disabled={isDisabled}
              aria-label={t('filters.max')}
              onChange={(event) => slideMax(Number(event.target.value))}
              className={sliderClasses}
            />
          </div>
          <div className="flex justify-between text-xs tabular text-on-surface-variant">
            <span>{formatValue(lower ?? bounds.min)}</span>
            <span>{formatValue(upper ?? bounds.max)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <NumberField
            key={`min-${minKey}`}
            label={t('filters.min')}
            value={lower}
            onChange={changeMin}
            disabled={isDisabled}
            className="flex-1"
          />
          <NumberField
            key={`max-${maxKey}`}
            label={t('filters.max')}
            value={upper}
            onChange={changeMax}
            disabled={isDisabled}
            className="flex-1"
          />
        </div>
      </div>
    </Field>
  )
}
