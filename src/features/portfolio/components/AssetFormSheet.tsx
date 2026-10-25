import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Asset, AssetDraft } from '@/data/models/asset'
import { MARKET_IDS, type Market } from '@/data/models/market'
import { createAsset, updateAsset } from '@/data/repositories/assets.repo'
import { getMarketApiKey } from '@/data/repositories/settings.repo'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { createMarketProviders } from '@/market/providers'
import { pickPreferredCandidate, type SymbolCandidate } from '@/market/symbols'
import { STALE_MS, priceKeyFor, type MarketProvider, type MarketRef } from '@/market/types'
import { usePrices } from '@/market/usePrices'
import { useSymbolCandidates } from '@/market/useSymbolCandidates'
import { Button } from '@/ui/components/Button'
import { Field } from '@/ui/components/Field'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { SelectField } from '@/ui/components/SelectField'
import { Sheet } from '@/ui/components/Sheet'
import { SymbolPicker } from '@/ui/components/SymbolPicker'
import { TextAreaField } from '@/ui/components/TextAreaField'
import { TextField } from '@/ui/components/TextField'

export interface AssetFormSheetProps {
  asset: Asset | null
  onClose: () => void
}

interface AssetSymbolMappingProps {
  symbol: string
  providers: readonly MarketProvider[]
  binanceSymbol: string | null
  coingeckoId: string | null
  onSelect: (candidate: SymbolCandidate | null) => void
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

function AssetSymbolMapping({
  symbol,
  providers,
  binanceSymbol,
  coingeckoId,
  onSelect,
}: AssetSymbolMappingProps) {
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
        {t('portfolio.priceUnavailable')}
      </p>
    )
  }

  if (candidates.length === 0) return null

  return (
    <SymbolPicker
      label={t('portfolio.symbolMapping')}
      candidates={candidates}
      value={findSelectedCandidate(candidates, binanceSymbol, coingeckoId)}
      onChange={onSelect}
    />
  )
}

export function AssetFormSheet({ asset, onClose }: AssetFormSheetProps) {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const initialMarket = asset?.market ?? preferences.defaultMarket
  const [symbol, setSymbol] = useState(asset?.symbol ?? '')
  const [market, setMarket] = useState<Market>(initialMarket)
  const [name, setName] = useState(asset?.name ?? '')
  const [quantity, setQuantity] = useState<number | null>(asset?.quantity ?? null)
  const [averageCost, setAverageCost] = useState<number | null>(asset?.averageCost ?? null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(asset?.currentPrice ?? null)
  const [autoPrice, setAutoPrice] = useState(asset ? asset.autoPrice : initialMarket === 'crypto')
  const [binanceSymbol, setBinanceSymbol] = useState<string | null>(asset?.binanceSymbol ?? null)
  const [coingeckoId, setCoingeckoId] = useState<string | null>(asset?.coingeckoId ?? null)
  const [notes, setNotes] = useState(asset?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const normalizedSymbol = symbol.trim().toUpperCase()
  const [mappingSymbol, setMappingSymbol] = useState(normalizedSymbol)
  const mappingIsCurrent = mappingSymbol === normalizedSymbol
  const effectiveBinanceSymbol = mappingIsCurrent ? binanceSymbol : null
  const effectiveCoingeckoId = mappingIsCurrent ? coingeckoId : null

  const autoPriceTouchedRef = useRef(false)
  const priceTouchedRef = useRef(false)
  const prefilledRef = useRef(false)

  const apiKey = useLiveQuery(() => getMarketApiKey(), [])
  const providers = useMemo(() => createMarketProviders(apiKey ?? null), [apiKey])

  const priceRefs = useMemo<MarketRef[]>(() => {
    if (!autoPrice || market !== 'crypto' || normalizedSymbol === '') return []
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
  }, [autoPrice, market, normalizedSymbol, effectiveBinanceSymbol, effectiveCoingeckoId])

  const { prices } = usePrices(priceRefs, 'detail')
  const priceRef = priceRefs[0]
  const currentQuote = priceRef ? prices.get(priceRef.key) : undefined

  const handleSelectMapping = useCallback(
    (candidate: SymbolCandidate | null) => {
      setMappingSymbol(normalizedSymbol)
      setBinanceSymbol(candidate?.binanceSymbol ?? null)
      setCoingeckoId(candidate?.coingeckoId ?? null)
    },
    [normalizedSymbol],
  )

  useEffect(() => {
    if (prefilledRef.current || priceTouchedRef.current || currentPrice !== null) return
    if (currentQuote === undefined) return
    if (Date.now() - currentQuote.fetchedAt >= STALE_MS) return

    const price = currentQuote.price
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || prefilledRef.current || priceTouchedRef.current) return
      prefilledRef.current = true
      setCurrentPrice(price)
    })

    return () => {
      cancelled = true
    }
  }, [currentQuote, currentPrice])

  function handleMarketChange(next: Market) {
    setMarket(next)
    if (next !== 'crypto') {
      setAutoPrice(false)
      return
    }
    if (!asset && !autoPriceTouchedRef.current) setAutoPrice(true)
  }

  async function handleSave() {
    const trimmedSymbol = symbol.trim().toUpperCase()
    if (trimmedSymbol === '') return setError(t('portfolio.validation.symbolRequired'))
    if (quantity === null) return setError(t('portfolio.validation.quantityRequired'))
    if (averageCost === null || averageCost < 0)
      return setError(t('portfolio.validation.avgCostNegative'))

    const draft: AssetDraft = {
      symbol: trimmedSymbol,
      market,
      name: name.trim() === '' ? null : name.trim(),
      quantity,
      averageCost,
      currentPrice,
      notes: notes.trim() === '' ? null : notes.trim(),
      autoPrice,
      binanceSymbol: effectiveBinanceSymbol,
      coingeckoId: effectiveCoingeckoId,
    }

    setSaving(true)
    try {
      if (asset) {
        await updateAsset(asset.id, draft)
      } else {
        await createAsset(draft)
      }
      onClose()
    } catch {
      setError(t('portfolio.validation.saveFailed'))
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={asset ? t('portfolio.editTitle', { symbol: asset.symbol }) : t('portfolio.addAsset')}
      footer={
        <>
          <Button variant="text" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {asset ? t('common.saveChanges') : t('portfolio.addAsset')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <TextField
          label={t('fields.symbol')}
          value={symbol}
          onChange={setSymbol}
          placeholder="BTC"
        />
        <SelectField
          label={t('fields.market')}
          value={market}
          options={MARKET_IDS.map((id) => ({ value: id, label: t(`markets.${id}`) }))}
          onChange={handleMarketChange}
        />
        <TextField
          label={t('fields.name')}
          value={name}
          onChange={setName}
          placeholder={t('portfolio.namePlaceholder')}
          className="col-span-1 sm:col-span-2"
        />
        <NumberField label={t('fields.quantity')} value={quantity} onChange={setQuantity} min={0} />
        <NumberField
          label={t('fields.averageCost')}
          value={averageCost}
          onChange={setAverageCost}
          min={0}
          hint={t('portfolio.avgCostHint')}
        />
        <NumberField
          label={t('fields.currentPrice')}
          value={currentPrice}
          onChange={(value) => {
            priceTouchedRef.current = true
            setCurrentPrice(value)
          }}
          min={0}
          hint={t('portfolio.currentPriceHint')}
        />
        {market === 'crypto' ? (
          <Field label={t('portfolio.autoPrice')} hint={t('portfolio.autoPriceHint')}>
            <SegmentedControl
              value={autoPrice ? 'auto' : 'manual'}
              options={[
                { value: 'auto', label: t('portfolio.autoPriceOn') },
                { value: 'manual', label: t('portfolio.autoPriceOff') },
              ]}
              onChange={(value) => {
                autoPriceTouchedRef.current = true
                setAutoPrice(value === 'auto')
              }}
              ariaLabel={t('portfolio.autoPrice')}
            />
          </Field>
        ) : null}
        {market === 'crypto' && autoPrice && normalizedSymbol !== '' ? (
          <div className="col-span-2 sm:col-span-3">
            <AssetSymbolMapping
              key={normalizedSymbol}
              symbol={normalizedSymbol}
              providers={providers}
              binanceSymbol={effectiveBinanceSymbol}
              coingeckoId={effectiveCoingeckoId}
              onSelect={handleSelectMapping}
            />
          </div>
        ) : null}
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
