import { useState } from 'react'
import type { Direction } from '@/calculations/types'
import type { Trade, TradeDraft } from '@/data/models/trade'
import { createTrade, updateTrade } from '@/data/repositories/trades.repo'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { fromDateInputValue, toDateInputValue } from '@/lib/dates'
import { Button } from '@/ui/components/Button'
import { DateField } from '@/ui/components/DateField'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Sheet } from '@/ui/components/Sheet'
import { TextAreaField } from '@/ui/components/TextAreaField'
import { TextField } from '@/ui/components/TextField'

export interface TradeFormSheetProps {
  trade: Trade | null
  onClose: () => void
}

function todayValue(): string {
  return toDateInputValue(new Date())
}

export function TradeFormSheet({ trade, onClose }: TradeFormSheetProps) {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const [symbol, setSymbol] = useState(trade?.symbol ?? '')
  const [direction, setDirection] = useState<Direction>(trade?.direction ?? 'long')
  const [entryPrice, setEntryPrice] = useState<number | null>(trade?.entryPrice ?? null)
  const [exitPrice, setExitPrice] = useState<number | null>(trade?.exitPrice ?? null)
  const [size, setSize] = useState<number | null>(trade?.size ?? null)
  const [leverage, setLeverage] = useState<number | null>(trade?.leverage ?? preferences.leverage)
  const [stopPrice, setStopPrice] = useState<number | null>(trade?.stopPrice ?? null)
  const [targetPrice, setTargetPrice] = useState<number | null>(trade?.targetPrice ?? null)
  const [fees, setFees] = useState<number | null>(trade?.fees ?? 0)
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

  async function handleSave() {
    const trimmedSymbol = symbol.trim().toUpperCase()
    if (trimmedSymbol === '') return setError(t('journal.validation.symbolRequired'))
    if (entryPrice === null || entryPrice <= 0)
      return setError(t('journal.validation.entryPricePositive'))
    if (size === null || size <= 0) return setError(t('journal.validation.sizePositive'))
    if (leverage === null || leverage < 1) return setError(t('journal.validation.leverageMin'))

    const openedDate = fromDateInputValue(openedAt)
    if (!openedDate) return setError(t('journal.validation.openedRequired'))
    const closedDate = closedAt === '' ? null : fromDateInputValue(closedAt)
    if (closedAt !== '' && !closedDate) return setError(t('journal.validation.closedInvalid'))

    const draft: TradeDraft = {
      symbol: trimmedSymbol,
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
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ''),
    }

    setSaving(true)
    try {
      if (trade) {
        await updateTrade(trade.id, draft)
      } else {
        await createTrade(draft)
      }
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
          onChange={setSymbol}
          placeholder="BTCUSDT"
          className="col-span-2 sm:col-span-1"
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
          onChange={setEntryPrice}
          min={0}
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
