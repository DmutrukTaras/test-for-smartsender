import React, { useState } from 'react'
import { useAuth } from '../../../auth/context/AuthContext'
import { useWebhookQueryParams } from '../../hooks/useWebhookQueryParams'
import { useWebhooks } from '../../hooks/useWebhooks'
import { WebhookTable } from '../WebhookTable/WebhookTable'
import { WebhookSearch } from '../WebhookSearch/WebhookSearch'
import { WebhookPagination } from '../WebhookPagination/WebhookPagination'
import { WebhookEditModal } from '../WebhookEditModal/WebhookEditModal'
import { Spinner } from '../../../../shared/components/Spinner/Spinner'
import { Button } from '../../../../shared/components/Button/Button'
import { Webhook } from '../../../../api/types'
import { LogOut, Webhook as WebhookIcon, AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import './WebhooksView.css'

export const WebhooksView: React.FC = () => {
  const { user, logout } = useAuth()
  const { page, search, setPage, setSearch } = useWebhookQueryParams()
  const { data, isLoading, isError, error, refetch, isFetching } = useWebhooks(page, search)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook)
  }

  const handleCloseModal = () => {
    setEditingWebhook(null)
  }

  return (
    <div className="webhooks-view">
      {/* Top Navbar */}
      <header className="webhooks-view__navbar">
        <div className="webhooks-view__navbar-container">
          <div className="webhooks-view__brand">
            <div className="webhooks-view__brand-icon">
              <WebhookIcon size={20} />
            </div>
            <span className="webhooks-view__brand-title">Smart Sender</span>
            <span className="webhooks-view__brand-badge">2.0</span>
          </div>

          <div className="webhooks-view__user-section">
            <div className="webhooks-view__user-info">
              <span className="webhooks-view__user-name">{user?.name || 'Admin'}</span>
              <span className="webhooks-view__user-email">{user?.email || 'admin@smartsender.com'}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<LogOut size={14} />}
              onClick={logout}
              className="webhooks-view__logout-btn"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="webhooks-view__content">
        <div className="webhooks-view__header">
          <div>
            <h1 className="webhooks-view__title">Webhooks</h1>
            <p className="webhooks-view__subtitle">
              Manage real-time notifications and HTTP endpoints for event callbacks
            </p>
          </div>
        </div>

        {/* Toolbar: Search and refresh */}
        <div className="webhooks-view__toolbar">
          <WebhookSearch value={search} onChange={setSearch} />
          {isFetching && !isLoading && (
            <div className="webhooks-view__refreshing-indicator">
              <RefreshCw size={14} className="webhooks-view__spin-icon" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {/* Status: Loading */}
        {isLoading && (
          <div className="webhooks-view__status-container" role="status">
            <Spinner size="lg" label="Loading webhooks..." />
            <p className="webhooks-view__status-text">Loading webhooks...</p>
          </div>
        )}

        {/* Status: Error */}
        {isError && !isLoading && (
          <div className="webhooks-view__error-box" role="alert">
            <AlertCircle size={24} className="webhooks-view__error-icon" />
            <div className="webhooks-view__error-content">
              <h3 className="webhooks-view__error-title">Failed to load webhooks</h3>
              <p className="webhooks-view__error-desc">
                {error instanceof Error ? error.message : 'An unexpected error occurred while fetching data.'}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Status: Empty Results */}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <div className="webhooks-view__empty-box">
            <div className="webhooks-view__empty-icon-wrap">
              <Inbox size={32} />
            </div>
            <h3 className="webhooks-view__empty-title">No webhooks found</h3>
            <p className="webhooks-view__empty-desc">
              {search
                ? `No webhooks match your search query "${search}". Try adjusting your keywords.`
                : 'There are currently no webhooks configured.'}
            </p>
            {search && (
              <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                Clear Search
              </Button>
            )}
          </div>
        )}

        {/* Success: Table & Pagination */}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <>
            <WebhookTable webhooks={data.data} onEdit={handleEdit} />
            <WebhookPagination
              currentPage={data.paging.pages.current}
              lastPage={data.paging.pages.last}
              total={data.paging.results.total}
              limit={data.paging.results.limitation}
              onPageChange={setPage}
            />
          </>
        )}
      </main>

      {/* Edit Webhook Modal */}
      <WebhookEditModal
        webhook={editingWebhook}
        isOpen={Boolean(editingWebhook)}
        onClose={handleCloseModal}
      />
    </div>
  )
}
