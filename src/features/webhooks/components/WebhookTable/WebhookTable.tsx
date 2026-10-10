import React from 'react'
import { Webhook } from '../../../../api/types'
import { Badge } from '../../../../shared/components/Badge/Badge'
import { Button } from '../../../../shared/components/Button/Button'
import { Edit2, ExternalLink } from 'lucide-react'
import './WebhookTable.css'

export interface WebhookTableProps {
  webhooks: Webhook[]
  onEdit: (webhook: Webhook) => void
}

export const WebhookTable: React.FC<WebhookTableProps> = ({ webhooks, onEdit }) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="webhook-table-container">
      <table className="webhook-table">
        <thead className="webhook-table__head">
          <tr className="webhook-table__row webhook-table__row--head">
            <th className="webhook-table__th">Name</th>
            <th className="webhook-table__th">Target URL</th>
            <th className="webhook-table__th">Status</th>
            <th className="webhook-table__th">Created At</th>
            <th className="webhook-table__th webhook-table__th--actions">Actions</th>
          </tr>
        </thead>
        <tbody className="webhook-table__body">
          {webhooks.map((webhook) => (
            <tr key={webhook.id} className="webhook-table__row">
              <td className="webhook-table__cell">
                <div className="webhook-table__name-group">
                  <span className="webhook-table__name">{webhook.name}</span>
                  <span className="webhook-table__id">{webhook.id}</span>
                </div>
              </td>
              <td className="webhook-table__cell">
                <a
                  href={webhook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="webhook-table__url-link"
                  title={webhook.url}
                >
                  <span className="webhook-table__url-text">{webhook.url}</span>
                  <ExternalLink size={12} className="webhook-table__url-icon" />
                </a>
              </td>
              <td className="webhook-table__cell">
                <Badge active={webhook.active} />
              </td>
              <td className="webhook-table__cell">
                <span className="webhook-table__date">{formatDate(webhook.created_at)}</span>
              </td>
              <td className="webhook-table__cell webhook-table__cell--actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(webhook)}
                  icon={<Edit2 size={13} />}
                  className="webhook-table__edit-btn"
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
