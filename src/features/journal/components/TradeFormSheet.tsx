import { useState } from 'react'
import type { Direction } from '@/calculations/types'
import type { Trade, TradeDraft } from '@/data/models/trade'
import { createTrade, updateTrade } from '@/data/repositories/trades.repo'
import { usePreferences } from '@/features/settings/SettingsContext'
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
    if (trimmedSymbol === '') return setError('Symbol is required.')
    if (entryPrice === null || entryPrice <= 0)
      return setError('Entry price must be greater than 0.')
    if (size === null || size <= 0) return setError('Size must be greater than 0.')
    if (leverage === null || leverage < 1) return setError('Leverage must be at least 1.')

    const openedDate = fromDateInputValue(openedAt)
    if (!openedDate) return setError('Opened date is required.')
    const closedDate = closedAt === '' ? null : fromDateInputValue(closedAt)
    if (closedAt !== '' && !closedDate) return setError('Closed date is not valid.')

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
      setError('Could not save this trade. Check the values and try again.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={trade ? `Edit ${trade.symbol}` : 'Add trade'}
      footer={
        <>
          <Button variant="text" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {trade ? 'Save changes' : 'Add trade'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <TextField
          label="Symbol"
          value={symbol}
          onChange={setSymbol}
          placeholder="BTCUSDT"
          className="col-span-2 sm:col-span-1"
        />
        <div className="flex flex-col gap-1">
          <span className="text-2xs font-medium tracking-wide text-on-surface-variant uppercase">
            Direction
          </span>
          <SegmentedControl
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'long', label: 'Long' },
              { value: 'short', label: 'Short' },
            ]}
          />
        </div>
        <NumberField label="Entry price" value={entryPrice} onChange={setEntryPrice} min={0} />
        <NumberField
          label="Exit price"
          value={exitPrice}
          onChange={setExitPrice}
          min={0}
          hint="Empty = open"
        />
        <NumberField label="Size" value={size} onChange={setSize} min={0} />
        <NumberField label="Leverage" unit="×" value={leverage} onChange={setLeverage} min={1} />
        <NumberField label="Stop price" value={stopPrice} onChange={setStopPrice} min={0} />
        <NumberField label="Target price" value={targetPrice} onChange={setTargetPrice} min={0} />
        <NumberField label="Fees (total)" value={fees} onChange={setFees} min={0} />
        <DateField label="Opened" value={openedAt} onChange={setOpenedAt} />
        <DateField label="Closed" value={closedAt} onChange={setClosedAt} hint="Empty = open" />
        <TextField
          label="Strategy"
          value={strategy}
          onChange={setStrategy}
          placeholder="Breakout"
        />
        <TextField
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="scalp, btc"
          hint="Comma separated"
          className="col-span-2 sm:col-span-1"
        />
        <TextAreaField
          label="Notes"
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
