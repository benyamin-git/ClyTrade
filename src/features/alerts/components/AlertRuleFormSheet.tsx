import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  AlertPercentDirection,
  AlertPriceMode,
  AlertRepeat,
  PriceAlert,
} from '@/data/models/price'
import { createAlert, updateAlert } from '@/data/repositories/alerts.repo'
import { getMarketApiKey } from '@/data/repositories/settings.repo'
import { useI18n } from '@/i18n/I18nContext'
import type { TranslationKey } from '@/i18n/types'
import { formatPrice } from '@/lib/format'
import { createMarketProviders } from '@/market/providers'
import { pickPreferredCandidate, type SymbolCandidate } from '@/market/symbols'
import { priceKeyFor, type MarketProvider, type MarketRef } from '@/market/types'
import { usePrices } from '@/market/usePrices'
import { useSymbolCandidates } from '@/market/useSymbolCandidates'
import { Button } from '@/ui/components/Button'
import { Field } from '@/ui/components/Field'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { SelectField } from '@/ui/components/SelectField'
import { Sheet } from '@/ui/components/Sheet'
import { SymbolPicker } from '@/ui/components/SymbolPicker'
import { TextField } from '@/ui/components/TextField'
import {
  DEFAULT_COOLDOWN_MINUTES,
  toAlertDraft,
  validateAlertForm,
  type AlertFormValues,
} from '../logic/alertForm'

export interface AlertRuleFormSheetProps {
  alert: PriceAlert | null
  onClose: () => void
}

function candidateFromAlert(alert: PriceAlert): SymbolCandidate | null {
  if (alert.binanceSymbol === null && alert.coingeckoId === null) return null
  return {
    provider: alert.binanceSymbol !== null ? 'binance' : 'coingecko',
    priceId: alert.binanceSymbol ?? alert.coingeckoId ?? '',
    symbol: alert.symbol,
    name: null,
    quote: null,
    rank: null,
    binanceSymbol: alert.binanceSymbol,
    coingeckoId: alert.coingeckoId,
  }
}

function candidateKey(candidate: SymbolCandidate): string {
  return `${candidate.provider}:${candidate.priceId}`
}

async function saveAlert(alert: PriceAlert | null, values: AlertFormValues): Promise<void> {
  const draft = toAlertDraft(values, Date.now())
  if (alert) {
    await updateAlert(alert.id, { ...draft, enabled: alert.enabled })
  } else {
    await createAlert(draft)
  }
}

export function AlertRuleFormSheet({ alert, onClose }: AlertRuleFormSheetProps) {
  const { t } = useI18n()
  const [kind, setKind] = useState<'price' | 'percent'>(alert?.kind ?? 'price')
  const [symbol, setSymbol] = useState(alert?.symbol ?? '')
  const [candidate, setCandidate] = useState<SymbolCandidate | null>(() =>
    alert ? candidateFromAlert(alert) : null,
  )
  const [priceMode, setPriceMode] = useState<AlertPriceMode>(alert?.priceMode ?? 'above')
  const [level, setLevel] = useState<number | null>(alert?.level ?? null)
  const [rangeLow, setRangeLow] = useState<number | null>(alert?.rangeLow ?? null)
  const [rangeHigh, setRangeHigh] = useState<number | null>(alert?.rangeHigh ?? null)
  const [percent, setPercent] = useState<number | null>(alert?.percent ?? null)
  const [percentDirection, setPercentDirection] = useState<AlertPercentDirection>(
    alert?.percentDirection ?? 'up',
  )
  const [repeat, setRepeat] = useState<AlertRepeat>(alert?.repeat ?? 'once')
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(
    alert?.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES,
  )
  const [note, setNote] = useState(alert?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const normalizedSymbol = symbol.trim().toUpperCase()
  const apiKey = useLiveQuery(() => getMarketApiKey(), [])
  const providers = useMemo<MarketProvider[]>(() => createMarketProviders(apiKey ?? null), [apiKey])
  const { candidates, loading } = useSymbolCandidates(normalizedSymbol, providers)
  const preferred = pickPreferredCandidate(candidates)
  const preferredCandidate =
    preferred !== null && (preferred.binanceSymbol !== null || preferred.coingeckoId !== null)
      ? preferred
      : null
  const selectedCandidate = candidate ?? preferredCandidate

  const priceRef = useMemo<MarketRef | null>(() => {
    if (selectedCandidate === null) return null
    if (selectedCandidate.binanceSymbol === null && selectedCandidate.coingeckoId === null) {
      return null
    }
    return {
      key: priceKeyFor({
        symbol: normalizedSymbol,
        binanceSymbol: selectedCandidate.binanceSymbol,
        coingeckoId: selectedCandidate.coingeckoId,
      }),
      symbol: normalizedSymbol,
      binanceSymbol: selectedCandidate.binanceSymbol,
      coingeckoId: selectedCandidate.coingeckoId,
    }
  }, [selectedCandidate, normalizedSymbol])

  const priceRefs = useMemo<MarketRef[]>(() => (priceRef ? [priceRef] : []), [priceRef])
  const { prices } = usePrices(priceRefs, 'detail')
  const quote = priceRef ? prices.get(priceRef.key) : undefined
  const currentPrice = quote !== undefined && quote.price > 0 ? quote.price : null
  const symbolUnchanged = alert !== null && alert.symbol.trim().toUpperCase() === normalizedSymbol
  const mappingUnchanged =
    alert !== null &&
    alert.binanceSymbol === (selectedCandidate?.binanceSymbol ?? null) &&
    alert.coingeckoId === (selectedCandidate?.coingeckoId ?? null)
  const referencePrice =
    alert !== null &&
    alert.kind === 'percent' &&
    alert.referencePrice !== null &&
    symbolUnchanged &&
    mappingUnchanged
      ? alert.referencePrice
      : currentPrice

  const pickerCandidates = useMemo(() => {
    if (selectedCandidate === null) return candidates
    if (selectedCandidate.binanceSymbol === null && selectedCandidate.coingeckoId === null) {
      return candidates
    }
    return [
      selectedCandidate,
      ...candidates.filter((entry) => candidateKey(entry) !== candidateKey(selectedCandidate)),
    ]
  }, [selectedCandidate, candidates])

  function handleSymbolChange(next: string) {
    if (next.trim().toUpperCase() !== normalizedSymbol) {
      setCandidate(null)
    }
    setSymbol(next)
  }

  function handleRepeatChange(next: AlertRepeat) {
    setRepeat(next)
    if (next !== 'cooldown') setCooldownMinutes(DEFAULT_COOLDOWN_MINUTES)
  }

  function formValues(): AlertFormValues {
    const isPrice = kind === 'price'
    const isRange = isPrice && priceMode === 'range'
    return {
      kind,
      symbol,
      candidate: selectedCandidate,
      priceMode: isPrice ? priceMode : null,
      level: isPrice && !isRange ? level : null,
      rangeLow: isRange ? rangeLow : null,
      rangeHigh: isRange ? rangeHigh : null,
      percent: isPrice ? null : percent,
      percentDirection: isPrice ? null : percentDirection,
      repeat,
      cooldownMinutes: repeat === 'cooldown' ? (cooldownMinutes ?? 0) : DEFAULT_COOLDOWN_MINUTES,
      note,
      referencePrice: isPrice ? null : referencePrice,
    }
  }

  async function handleSave() {
    const values = formValues()
    const validationKey = validateAlertForm(values)
    if (validationKey !== null) {
      setError(t(validationKey as TranslationKey))
      return
    }

    setSaving(true)
    try {
      await saveAlert(alert, values)
      onClose()
    } catch {
      setError(t('alerts.form.saveFailed'))
      setSaving(false)
    }
  }

  const symbolHint =
    normalizedSymbol !== '' && !loading && candidates.length === 0
      ? t('symbolPicker.empty')
      : undefined

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        alert ? t('alerts.form.editTitle', { symbol: alert.symbol }) : t('alerts.form.createTitle')
      }
      footer={
        <>
          <Button variant="text" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {alert ? t('common.saveChanges') : t('alerts.form.create')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label={t('alerts.form.kind')} className="col-span-2 sm:col-span-3">
          <SegmentedControl
            value={kind}
            options={[
              { value: 'price', label: t('alerts.form.kindPrice') },
              { value: 'percent', label: t('alerts.form.kindPercent') },
            ]}
            onChange={setKind}
            ariaLabel={t('alerts.form.kind')}
          />
        </Field>

        <TextField
          label={t('alerts.form.symbol')}
          value={symbol}
          onChange={handleSymbolChange}
          placeholder={t('alerts.form.symbolPlaceholder')}
          hint={symbolHint}
          className="col-span-2 sm:col-span-1"
        />

        {pickerCandidates.length > 0 ? (
          <div className="col-span-2">
            <SymbolPicker
              label={t('alerts.form.symbolMapping')}
              candidates={pickerCandidates}
              value={selectedCandidate}
              onChange={setCandidate}
            />
          </div>
        ) : null}

        {kind === 'price' ? (
          <>
            <SelectField
              label={t('alerts.form.priceMode')}
              value={priceMode}
              options={[
                { value: 'above', label: t('alerts.form.modes.above') },
                { value: 'below', label: t('alerts.form.modes.below') },
                { value: 'crossing', label: t('alerts.form.modes.crossing') },
                { value: 'range', label: t('alerts.form.modes.range') },
              ]}
              onChange={setPriceMode}
            />
            {priceMode === 'range' ? (
              <>
                <NumberField
                  label={t('alerts.form.rangeLow')}
                  value={rangeLow}
                  onChange={setRangeLow}
                  min={0}
                />
                <NumberField
                  label={t('alerts.form.rangeHigh')}
                  value={rangeHigh}
                  onChange={setRangeHigh}
                  min={0}
                />
              </>
            ) : (
              <NumberField
                label={t('alerts.form.level')}
                value={level}
                onChange={setLevel}
                min={0}
              />
            )}
          </>
        ) : (
          <>
            <SelectField
              label={t('alerts.form.percentDirection')}
              value={percentDirection}
              options={[
                { value: 'up', label: t('alerts.form.directions.up') },
                { value: 'down', label: t('alerts.form.directions.down') },
                { value: 'both', label: t('alerts.form.directions.both') },
              ]}
              onChange={setPercentDirection}
            />
            <NumberField
              label={t('alerts.form.percent')}
              value={percent}
              onChange={setPercent}
              min={0}
              unit="%"
            />
          </>
        )}

        <Field label={t('alerts.form.repeat')} className="col-span-2 sm:col-span-3">
          <SegmentedControl
            value={repeat}
            options={[
              { value: 'once', label: t('alerts.form.repeats.once') },
              { value: 'cross-back', label: t('alerts.form.repeats.crossBack') },
              { value: 'cooldown', label: t('alerts.form.repeats.cooldown') },
            ]}
            onChange={handleRepeatChange}
            ariaLabel={t('alerts.form.repeat')}
          />
        </Field>

        {repeat === 'cooldown' ? (
          <NumberField
            label={t('alerts.form.cooldown')}
            value={cooldownMinutes}
            onChange={setCooldownMinutes}
            min={15}
            max={1440}
            hint={t('alerts.form.cooldownHint')}
          />
        ) : null}

        <TextField
          label={t('alerts.form.note')}
          value={note}
          onChange={setNote}
          className="col-span-2 sm:col-span-3"
        />
      </div>

      {kind === 'percent' && normalizedSymbol !== '' && referencePrice === null ? (
        <p role="status" className="mt-3 text-xs text-on-surface-variant">
          {t('alerts.form.priceUnavailable')}
        </p>
      ) : kind === 'percent' && referencePrice !== null ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          {t('alerts.form.referenceHint', { price: formatPrice(referencePrice) })}
        </p>
      ) : kind === 'price' && currentPrice !== null ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          {t('alerts.form.currentPriceHint', { price: formatPrice(currentPrice) })}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-xs text-error">
          {error}
        </p>
      ) : null}
    </Sheet>
  )
}
