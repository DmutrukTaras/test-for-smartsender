import { apiClient } from '../../api/client'
import { Webhook, WebhookList, UpdateWebhookRequest } from '../../api/types'

export interface GetWebhooksParams {
  page?: number
  limit?: number
  search?: string
}

export const webhooksApi = {
  async getWebhooks(params: GetWebhooksParams = {}): Promise<WebhookList> {
    const queryParams = new URLSearchParams()
    if (params.page !== undefined) queryParams.set('page', params.page.toString())
    if (params.limit !== undefined) queryParams.set('limit', params.limit.toString())
    if (params.search !== undefined && params.search.trim() !== '') {
      queryParams.set('search', params.search.trim())
    }

    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webhooks?${queryString}` : '/v1/webhooks'

    const response = await apiClient.get<WebhookList>(url)
    return response.data
  },

  async getWebhook(id: string): Promise<Webhook> {
    const response = await apiClient.get<Webhook>(`/v1/webhooks/${id}`)
    return response.data
  },

  async updateWebhook(id: string, data: UpdateWebhookRequest): Promise<Webhook> {
    const response = await apiClient.put<Webhook>(`/v1/webhooks/${id}`, data)
    return response.data
  },
}
