import { z } from 'zod'

export const updateWebhookSchema = z.object({
  name: z.string().trim().min(1, 'The name field is required.'),
  url: z
    .string()
    .trim()
    .min(1, 'The url field is required.')
    .refine(
      (val) => {
        try {
          const parsed = new URL(val)
          return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        } catch {
          return false
        }
      },
      {
        message: 'The url must be a valid HTTP or HTTPS URL.',
      }
    ),
})

export type UpdateWebhookFormValues = z.infer<typeof updateWebhookSchema>
