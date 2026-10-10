import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Webhook, ApiErrorResponse } from '../../../../api/types'
import {
  updateWebhookSchema,
  UpdateWebhookFormValues,
} from '../../schemas/webhook.schema'
import { useUpdateWebhook } from '../../hooks/useWebhooks'
import { Modal } from '../../../../shared/components/Modal/Modal'
import { Input } from '../../../../shared/components/Input/Input'
import { Button } from '../../../../shared/components/Button/Button'
import './WebhookEditModal.css'

export interface WebhookEditModalProps {
  webhook: Webhook | null
  isOpen: boolean
  onClose: () => void
}

export const WebhookEditModal: React.FC<WebhookEditModalProps> = ({
  webhook,
  isOpen,
  onClose,
}) => {
  const [generalError, setGeneralError] = useState<string | null>(null)
  const updateMutation = useUpdateWebhook()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateWebhookFormValues>({
    resolver: zodResolver(updateWebhookSchema),
    defaultValues: {
      name: '',
      url: '',
    },
  })

  useEffect(() => {
    if (webhook) {
      reset({
        name: webhook.name,
        url: webhook.url,
      })
      setGeneralError(null)
    }
  }, [webhook, reset])

  const onSubmit = async (values: UpdateWebhookFormValues) => {
    if (!webhook) return
    setGeneralError(null)

    try {
      await updateMutation.mutateAsync({
        id: webhook.id,
        data: values,
      })
      onClose()
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorResponse>(err) && err.response?.data?.error) {
        const errorData = err.response.data.error

        // Map backend validation payload to fields
        if (errorData.payload) {
          if (errorData.payload.name?.[0]) {
            setError('name', { message: errorData.payload.name[0] })
          }
          if (errorData.payload.url?.[0]) {
            setError('url', { message: errorData.payload.url[0] })
          }
        } else {
          setGeneralError(errorData.message || 'Failed to update webhook.')
        }
      } else {
        setGeneralError('Network error or server unavailable.')
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Webhook"
      description={webhook ? `Update settings for ${webhook.id}` : undefined}
    >
      <form
        className="edit-webhook-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {generalError && (
          <div className="edit-webhook-form__alert" role="alert">
            {generalError}
          </div>
        )}

        <div className="edit-webhook-form__fields">
          <Input
            label="Webhook Name"
            placeholder="e.g. Lead Generation Webhook"
            error={errors.name?.message}
            disabled={isSubmitting || updateMutation.isPending}
            {...register('name')}
          />

          <Input
            label="Target URL"
            type="url"
            placeholder="https://api.yourdomain.com/webhooks"
            hint="Must be a valid HTTP or HTTPS endpoint"
            error={errors.url?.message}
            disabled={isSubmitting || updateMutation.isPending}
            {...register('url')}
          />
        </div>

        <div className="edit-webhook-form__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting || updateMutation.isPending}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
