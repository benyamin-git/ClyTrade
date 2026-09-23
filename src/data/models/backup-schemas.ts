import { z } from 'zod'

export const settingRowSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  updatedAt: z.number(),
})
