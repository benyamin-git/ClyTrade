import { useState } from 'react'
import type { Asset, AssetDraft } from '@/data/models/asset'
import { createAsset, updateAsset } from '@/data/repositories/assets.repo'
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
    if (trimmedSymbol === '') return setError('Symbol is required.')
    if (quantity === null) return setError('Quantity is required.')
    if (averageCost === null || averageCost < 0) return setError('Average cost cannot be negative.')

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
      setError('Could not save this asset. Check the values and try again.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={asset ? `Edit ${asset.symbol}` : 'Add asset'}
      footer={
        <>
          <Button variant="text" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {asset ? 'Save changes' : 'Add asset'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <TextField label="Symbol" value={symbol} onChange={setSymbol} placeholder="BTC" />
        <TextField
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Bitcoin"
          className="col-span-1 sm:col-span-2"
        />
        <NumberField label="Quantity" value={quantity} onChange={setQuantity} min={0} />
        <NumberField
          label="Average cost"
          value={averageCost}
          onChange={setAverageCost}
          min={0}
          hint="Per unit"
        />
        <NumberField
          label="Current price"
          value={currentPrice}
          onChange={setCurrentPrice}
          min={0}
          hint="Empty = valued at cost"
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
