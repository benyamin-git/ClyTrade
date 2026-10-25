import type { SymbolCandidate } from '@/market/symbols'
import { useI18n } from '@/i18n/I18nContext'
import { SelectField } from './SelectField'

export interface SymbolPickerProps {
  label: string
  candidates: readonly SymbolCandidate[]
  value: SymbolCandidate | null
  onChange: (candidate: SymbolCandidate | null) => void
  disabled?: boolean
}

function candidateKey(candidate: SymbolCandidate): string {
  return `${candidate.provider}:${candidate.priceId}`
}

function providerLabel(provider: SymbolCandidate['provider']): string {
  return provider === 'binance' ? 'Binance' : 'CoinGecko'
}

export function SymbolPicker({ label, candidates, value, onChange, disabled }: SymbolPickerProps) {
  const { t } = useI18n()
  const options = [
    { value: '', label: t('symbolPicker.none') },
    ...candidates.map((candidate) => ({
      value: candidateKey(candidate),
      label: `${candidate.symbol} — ${candidate.name ?? candidate.symbol} (${providerLabel(candidate.provider)})`,
    })),
  ]

  return (
    <SelectField
      label={label}
      value={value ? candidateKey(value) : ''}
      options={options}
      onChange={(next) => {
        if (!next) {
          onChange(null)
          return
        }
        onChange(candidates.find((candidate) => candidateKey(candidate) === next) ?? null)
      }}
      disabled={disabled}
      hint={candidates.length === 0 ? t('symbolPicker.empty') : undefined}
    />
  )
}
