import { useState } from 'react'
import type { Asset, AssetDraft } from '@/data/models/asset'
import { createAsset, updateAsset } from '@/data/repositories/assets.repo'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/ui/components/Button'
import { NumberField } from '@/ui/components/NumberField'
import { Sheet } from '@/ui/components/Sheet'
import { TextAreaField } from '@/ui/components/TextAreaField'
import { TextField } from '@/ui/components/TextField'

export interface AssetFormSheetProps {
  asset: Asset | null
  onClose: () => void
}

export function AssetFormSheet({ asset, onClose }: AssetFormSheetProps) {
  const { t } = useI18n()
  const [symbol, setSymbol] = useState(asset?.symbol ?? '')
  const [name, setName] = useState(asset?.name ?? '')
  const [quantity, setQuantity] = useState<number | null>(asset?.quantity ?? null)
  const [averageCost, setAverageCost] = useState<number | null>(asset?.averageCost ?? null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(asset?.currentPrice ?? null)
  const [notes, setNotes] = useState(asset?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmedSymbol = symbol.trim().toUpperCase()
    if (trimmedSymbol === '') return setError(t('portfolio.validation.symbolRequired'))
    if (quantity === null) return setError(t('portfolio.validation.quantityRequired'))
    if (averageCost === null || averageCost < 0)
      return setError(t('portfolio.validation.avgCostNegative'))

    const draft: AssetDraft = {
      symbol: trimmedSymbol,
      name: name.trim() === '' ? null : name.trim(),
      quantity,
      averageCost,
      currentPrice,
      notes: notes.trim() === '' ? null : notes.trim(),
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
          onChange={setCurrentPrice}
          min={0}
          hint={t('portfolio.currentPriceHint')}
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
