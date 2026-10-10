import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export function useWebhookQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = useMemo(() => {
    const raw = searchParams.get('page')
    if (!raw) return 1
    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
  }, [searchParams])

  const search = useMemo(() => {
    return searchParams.get('search') || ''
  }, [searchParams])

  const setPage = useCallback(
    (newPage: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (newPage <= 1) {
            next.delete('page')
          } else {
            next.set('page', newPage.toString())
          }
          return next
        },
        // Preserve history for pagination so Back/Forward buttons navigate between pages
        { replace: false }
      )
    },
    [setSearchParams]
  )

  const setSearch = useCallback(
    (newSearch: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const trimmed = newSearch.trim()
          if (!trimmed) {
            next.delete('search')
          } else {
            next.set('search', trimmed)
          }
          // Changing search must always reset to page 1 as required by technical specs
          next.delete('page')
          return next
        },
        // Replace current history entry for search to avoid polluting history stack with search typing
        { replace: true }
      )
    },
    [setSearchParams]
  )

  return {
    page,
    search,
    setPage,
    setSearch,
  }
}
