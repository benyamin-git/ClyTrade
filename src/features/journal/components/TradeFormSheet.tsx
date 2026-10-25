import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Direction } from '@/calculations/types'
import { MARKET_IDS, type Market } from '@/data/models/market'
import type { Trade, TradeDraft } from '@/data/models/trade'
import { getMarketApiKey } from '@/data/repositories/settings.repo'
import { createTrade, updateTrade } from '@/data/repositories/trades.repo'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { fromDateInputValue, toDateInputValue } from '@/lib/dates'
import { formatPrice } from '@/lib/format'
import { createMarketProviders } from '@/market/providers'
import { pickPreferredCandidate, type SymbolCandidate } from '@/market/symbols'
import { STALE_MS, priceKeyFor, type MarketProvider, type MarketRef } from '@/market/types'
import { usePrices } from '@/market/usePrices'
import { useSymbolCandidates } from '@/market/useSymbolCandidates'
import { Button } from '@/ui/components/Button'
import { DateField } from '@/ui/components/DateField'
import { Field } from '@/ui/components/Field'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { SelectField } from '@/ui/components/SelectField'
import { Sheet } from '@/ui/components/Sheet'
import { SymbolPicker } from '@/ui/components/SymbolPicker'
import { TextAreaField } from '@/ui/components/TextAreaField'
import { TextField } from '@/ui/components/TextField'

export interface TradeFormSheetProps {
  trade: Trade | null
  onClose: () => void
  onSaved?: () => void
}

interface TradeSymbolMappingProps {
  symbol: string
  providers: readonly MarketProvider[]
  binanceSymbol: string | null
  coingeckoId: string | null
  onSelect: (candidate: SymbolCandidate | null) => void
}

function todayValue(): string {
  return toDateInputValue(new Date())
}

function isFreshPrice(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < STALE_MS
}

function mappingKey(
  symbol: string,
  binanceSymbol: string | null,
  coingeckoId: string | null,
): string {
  return `${symbol}|${binanceSymbol ?? ''}|${coingeckoId ?? ''}`
}

function findSelectedCandidate(
  candidates: readonly SymbolCandidate[],
  binanceSymbol: string | null,
  coingeckoId: string | null,
): SymbolCandidate | null {
  const exact = candidates.find(
    (candidate) =>
      candidate.binanceSymbol === binanceSymbol && candidate.coingeckoId === coingeckoId,
  )
  if (exact) return exact

  if (coingeckoId !== null) {
    const byCoin =
      candidates.find(
        (candidate) => candidate.provider === 'coingecko' && candidate.coingeckoId === coingeckoId,
      ) ?? candidates.find((candidate) => candidate.coingeckoId === coingeckoId)
    if (byCoin) return byCoin
  }

  if (binanceSymbol !== null) {
    return candidates.find((candidate) => candidate.binanceSymbol === binanceSymbol) ?? null
  }

  return null
}

function TradeSymbolMapping({
  symbol,
  providers,
  binanceSymbol,
  coingeckoId,
  onSelect,
}: TradeSymbolMappingProps) {
  const { t } = useI18n()
  const { candidates, loading, error } = useSymbolCandidates(symbol, providers)
  const preferred = pickPreferredCandidate(candidates)
  const hasMapping = binanceSymbol !== null || coingeckoId !== null

  useEffect(() => {
    if (preferred === null || hasMapping) return
    if (preferred.binanceSymbol === null && preferred.coingeckoId === null) return
    onSelect(preferred)
  }, [preferred, hasMapping, onSelect])

  if (preferred !== null || loading) return null

  if (!hasMapping && (error !== null || candidates.length === 0)) {
    return (
      <p role="status" className="text-xs text-on-surface-variant">
        {t('journal.priceUnavailable')}
      </p>
    )
  }

  if (candidates.length === 0) return null

  return (
    <SymbolPicker
      label={t('journal.symbolMapping')}
      candidates={candidates}
      value={findSelectedCandidate(candidates, binanceSymbol, coingeckoId)}
      onChange={onSelect}
    />
  )
}

export function TradeFormSheet({ trade, onClose, onSaved }: TradeFormSheetProps) {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const [symbol, setSymbol] = useState(trade?.symbol ?? '')
  const [market, setMarket] = useState<Market>(trade?.market ?? preferences.defaultMarket)
  const [direction, setDirection] = useState<Direction>(trade?.direction ?? 'long')
  const [entryPrice, setEntryPrice] = useState<number | null>(trade?.entryPrice ?? null)
  const [exitPrice, setExitPrice] = useState<number | null>(trade?.exitPrice ?? null)
  const [size, setSize] = useState<number | null>(trade?.size ?? null)
  const [leverage, setLeverage] = useState<number | null>(trade?.leverage ?? preferences.leverage)
  const [stopPrice, setStopPrice] = useState<number | null>(trade?.stopPrice ?? null)
  const [targetPrice, setTargetPrice] = useState<number | null>(trade?.targetPrice ?? null)
  const [fees, setFees] = useState<number | null>(trade?.fees ?? 0)
  const [autoClose, setAutoClose] = useState(
    trade ? trade.autoClose : preferences.autoCloseByDefault,
  )
  const [binanceSymbol, setBinanceSymbol] = useState<string | null>(trade?.binanceSymbol ?? null)
  const [coingeckoId, setCoingeckoId] = useState<string | null>(trade?.coingeckoId ?? null)
  const [openedAt, setOpenedAt] = useState(
    trade ? toDateInputValue(new Date(trade.openedAt)) : todayValue(),
  )
  const [closedAt, setClosedAt] = useState(
    trade?.closedAt ? toDateInputValue(new Date(trade.closedAt)) : '',
  )
  const [strategy, setStrategy] = useState(trade?.strategy ?? '')
  const [notes, setNotes] = useState(trade?.notes ?? '')
  const [tags, setTags] = useState(trade?.tags.join(', ') ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const normalizedSymbol = symbol.trim().toUpperCase()
  const [mappingSymbol, setMappingSymbol] = useState(normalizedSymbol)
  const mappingIsCurrent = mappingSymbol === normalizedSymbol
  const isCrypto = market === 'crypto'
  const effectiveBinanceSymbol = isCrypto && mappingIsCurrent ? binanceSymbol : null
  const effectiveCoingeckoId = isCrypto && mappingIsCurrent ? coingeckoId : null
  const selectionKey = mappingKey(normalizedSymbol, effectiveBinanceSymbol, effectiveCoingeckoId)

  const entryPriceTouchedRef = useRef(false)
  const prefilledRef = useRef<{ price: number; selectionKey: string } | null>(null)

  const clearPrefilledPrice = useCallback((nextSelectionKey: string) => {
    const prefilled = prefilledRef.current
    if (prefilled === null || prefilled.selectionKey === nextSelectionKey) return
    if (entryPriceTouchedRef.current) return
    prefilledRef.current = null
    setEntryPrice((value) => (value === prefilled.price ? null : value))
  }, [])

  const apiKey = useLiveQuery(() => getMarketApiKey(), [])
  const providers = useMemo(() => createMarketProviders(apiKey ?? null), [apiKey])

  const priceRefs = useMemo<MarketRef[]>(() => {
    if (!isCrypto || normalizedSymbol === '') return []
    if (effectiveBinanceSymbol === null && effectiveCoingeckoId === null) return []
    return [
      {
        key: priceKeyFor({
          symbol: normalizedSymbol,
          binanceSymbol: effectiveBinanceSymbol,
          coingeckoId: effectiveCoingeckoId,
        }),
        symbol: normalizedSymbol,
        binanceSymbol: effectiveBinanceSymbol,
        coingeckoId: effectiveCoingeckoId,
      },
    ]
  }, [isCrypto, normalizedSymbol, effectiveBinanceSymbol, effectiveCoingeckoId])

  const { prices } = usePrices(priceRefs, 'detail')
  const priceRef = priceRefs[0]
  const currentQuote = priceRef ? prices.get(priceRef.key) : undefined
  const currentPrice = currentQuote?.price ?? null

  const handleSelectMapping = useCallback(
    (candidate: SymbolCandidate | null) => {
      const nextBinanceSymbol = candidate?.binanceSymbol ?? null
      const nextCoingeckoId = candidate?.coingeckoId ?? null
      clearPrefilledPrice(mappingKey(normalizedSymbol, nextBinanceSymbol, nextCoingeckoId))
      setMappingSymbol(normalizedSymbol)
      setBinanceSymbol(nextBinanceSymbol)
      setCoingeckoId(nextCoingeckoId)
    },
    [normalizedSymbol, clearPrefilledPrice],
  )

  function handleSymbolChange(next: string) {
    const nextNormalized = next.trim().toUpperCase()
    if (nextNormalized !== normalizedSymbol) {
      clearPrefilledPrice(mappingKey(nextNormalized, null, null))
    }
    setSymbol(next)
  }

  useEffect(() => {
    if (trade !== null) return
    if (entryPriceTouchedRef.current || entryPrice !== null) return
    if (currentQuote === undefined) return
    if (!isFreshPrice(currentQuote.fetchedAt)) return

    const price = currentQuote.price
    const key = selectionKey
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || entryPriceTouchedRef.current || prefilledRef.current !== null) return
      prefilledRef.current = { price, selectionKey: key }
      setEntryPrice(price)
    })

    return () => {
      cancelled = true
    }
  }, [trade, currentQuote, entryPrice, selectionKey])

  async function handleSave() {
    const trimmedSymbol = symbol.trim().toUpperCase()
    if (trimmedSymbol === '') return setError(t('journal.validation.symbolRequired'))
    if (entryPrice === null || entryPrice <= 0)
      return setError(t('journal.validation.entryPricePositive'))
    if (size === null || size <= 0) return setError(t('journal.validation.sizePositive'))
    if (leverage === null || leverage < 1) return setError(t('journal.validation.leverageMin'))
    if (exitPrice !== null && exitPrice <= 0)
      return setError(t('journal.validation.exitPricePositive'))
    if (stopPrice !== null && stopPrice <= 0)
      return setError(t('journal.validation.stopPricePositive'))
    if (targetPrice !== null && targetPrice <= 0)
      return setError(t('journal.validation.targetPricePositive'))
    if (fees !== null && fees < 0) return setError(t('journal.validation.feesNegative'))

    const openedDate = fromDateInputValue(openedAt)
    if (!openedDate) return setError(t('journal.validation.openedRequired'))
    const closedDate = closedAt === '' ? null : fromDateInputValue(closedAt)
    if (closedAt !== '' && !closedDate) return setError(t('journal.validation.closedInvalid'))
    if (exitPrice !== null && closedDate === null)
      return setError(t('journal.validation.exitRequiresClosed'))
    if (exitPrice === null && closedDate !== null)
      return setError(t('journal.validation.closedRequiresExit'))
    if (closedDate !== null && closedDate.getTime() < openedDate.getTime())
      return setError(t('journal.validation.closedBeforeOpened'))

    const draft: TradeDraft = {
      symbol: trimmedSymbol,
      market,
      direction,
      status: exitPrice === null ? 'open' : 'closed',
      entryPrice,
      exitPrice,
      size,
      leverage,
      stopPrice,
      targetPrice,
      fees: fees ?? 0,
      openedAt: openedDate.getTime(),
      closedAt: closedDate ? closedDate.getTime() : null,
      strategy: strategy.trim() === '' ? null : strategy.trim(),
      notes: notes.trim() === '' ? null : notes.trim(),
      tags: tags
        .split(/[,،]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ''),
      autoClose,
      binanceSymbol: effectiveBinanceSymbol,
      coingeckoId: effectiveCoingeckoId,
    }

    setSaving(true)
    try {
      if (trade) {
        await updateTrade(trade.id, draft)
      } else {
        await createTrade(draft)
      }
      onSaved?.()
      onClose()
    } catch {
      setError(t('journal.validation.saveFailed'))
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={trade ? t('journal.editTitle', { symbol: trade.symbol }) : t('journal.addTrade')}
      footer={
        <>
          <Button variant="text" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {trade ? t('common.saveChanges') : t('journal.addTrade')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <TextField
          label={t('fields.symbol')}
          value={symbol}
          onChange={handleSymbolChange}
          placeholder="BTCUSDT"
          className="col-span-2 sm:col-span-1"
        />
        <SelectField
          label={t('fields.market')}
          value={market}
          options={MARKET_IDS.map((id) => ({ value: id, label: t(`markets.${id}`) }))}
          onChange={setMarket}
        />
        <div className="flex flex-col gap-1">
          <span className="text-2xs font-medium tracking-wide text-on-surface-variant uppercase">
            {t('fields.direction')}
          </span>
          <SegmentedControl
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'long', label: t('direction.long') },
              { value: 'short', label: t('direction.short') },
            ]}
          />
        </div>
        <NumberField
          label={t('fields.entryPrice')}
          value={entryPrice}
          onChange={(value) => {
            entryPriceTouchedRef.current = true
            setEntryPrice(value)
          }}
          min={0}
          hint={
            currentPrice !== null
              ? t('journal.currentPriceHint', { price: formatPrice(currentPrice) })
              : undefined
          }
        />
        <NumberField
          label={t('fields.exitPrice')}
          value={exitPrice}
          onChange={setExitPrice}
          min={0}
          hint={t('journal.formStatusHint')}
        />
        <NumberField label={t('fields.size')} value={size} onChange={setSize} min={0} />
        <NumberField
          label={t('fields.leverage')}
          unit="×"
          value={leverage}
          onChange={setLeverage}
          min={1}
        />
        <NumberField
          label={t('fields.stopPrice')}
          value={stopPrice}
          onChange={setStopPrice}
          min={0}
        />
        <NumberField
          label={t('fields.targetPrice')}
          value={targetPrice}
          onChange={setTargetPrice}
          min={0}
        />
        <Field label={t('journal.autoClose')} hint={t('journal.autoCloseHint')}>
          <SegmentedControl
            value={autoClose ? 'included' : 'excluded'}
            options={[
              { value: 'included', label: t('journal.autoCloseOn') },
              { value: 'excluded', label: t('journal.autoCloseOff') },
            ]}
            onChange={(value) => setAutoClose(value === 'included')}
            ariaLabel={t('journal.autoClose')}
          />
        </Field>
        {isCrypto && normalizedSymbol !== '' ? (
          <div className="col-span-2 sm:col-span-3">
            <TradeSymbolMapping
              key={normalizedSymbol}
              symbol={normalizedSymbol}
              providers={providers}
              binanceSymbol={effectiveBinanceSymbol}
              coingeckoId={effectiveCoingeckoId}
              onSelect={handleSelectMapping}
            />
          </div>
        ) : null}
        <NumberField label={t('fields.feesTotal')} value={fees} onChange={setFees} min={0} />
        <DateField label={t('fields.opened')} value={openedAt} onChange={setOpenedAt} />
        <DateField
          label={t('fields.closed')}
          value={closedAt}
          onChange={setClosedAt}
          hint={t('journal.formStatusHint')}
        />
        <TextField
          label={t('fields.strategy')}
          value={strategy}
          onChange={setStrategy}
          placeholder={t('journal.strategyPlaceholder')}
        />
        <TextField
          label={t('fields.tags')}
          value={tags}
          onChange={setTags}
          placeholder="scalp, btc"
          hint={t('journal.tagsHint')}
          className="col-span-2 sm:col-span-1"
        />
        <TextAreaField
          label={t('fields.notes')}
          value={notes}
          onChange={setNotes}
          className="col-span-2 sm:col-span-3"
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-error">
          {error}
        </p>
      ) : null}
    </Sheet>
  )
}
