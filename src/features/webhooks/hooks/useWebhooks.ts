import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { webhooksApi } from '../webhooks.api'
import { UpdateWebhookRequest } from '../../../api/types'

export function useWebhooks(page: number, search: string) {
  return useQuery({
    queryKey: ['webhooks', { page, search }],
    queryFn: () => webhooksApi.getWebhooks({ page, limit: 10, search }),
  })
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookRequest }) =>
      webhooksApi.updateWebhook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}
