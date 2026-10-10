import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './WebhookPagination.css'

export interface WebhookPaginationProps {
  currentPage: number
  lastPage: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export const WebhookPagination: React.FC<WebhookPaginationProps> = ({
  currentPage,
  lastPage,
  total,
  limit,
  onPageChange,
}) => {
  if (total === 0) return null

  const startItem = (currentPage - 1) * limit + 1
  const endItem = Math.min(currentPage * limit, total)

  // Generate page numbers to display
  const pageNumbers = Array.from({ length: lastPage }, (_, i) => i + 1)

  return (
    <div className="pagination">
      <div className="pagination__summary">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
        <strong>{total}</strong> webhooks
      </div>

      <div className="pagination__actions">
        <button
          type="button"
          className="pagination__nav-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <div className="pagination__pages">
          {pageNumbers.map((p) => {
            const isActive = p === currentPage
            return (
              <button
                key={p}
                type="button"
                className={`pagination__page-btn ${isActive ? 'pagination__page-btn--active' : ''}`}
                onClick={() => onPageChange(p)}
                aria-current={isActive ? 'page' : undefined}
              >
                {p}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="pagination__nav-btn"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
