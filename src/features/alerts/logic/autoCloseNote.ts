import type { Translator } from '@/i18n/translate'
import type { BackgroundNoteInput } from '@/market/backgroundImport'
import { formatDate, formatTime } from '@/lib/dates'
import { formatPrice } from '@/lib/format'

export type AutoCloseNoteInput = BackgroundNoteInput

export function buildAutoCloseNote(t: Translator, input: AutoCloseNoteInput): string {
  return t('alerts.autoCloseNote', {
    symbol: input.symbol,
    level: formatPrice(input.level),
    reason: t(`alerts.kinds.${input.reason}`),
    price: formatPrice(input.price),
    time: `${formatDate(input.at)} · ${formatTime(input.at)}`,
  })
}
