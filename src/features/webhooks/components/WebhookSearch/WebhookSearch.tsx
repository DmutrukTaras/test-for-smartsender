import React, { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import './WebhookSearch.css'

export interface WebhookSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

export const WebhookSearch: React.FC<WebhookSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search webhooks by name...',
  debounceMs = 300,
}) => {
  const [internalValue, setInternalValue] = useState(value)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync internal value when external prop changes (e.g. Back/Forward browser navigation)
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value
    setInternalValue(nextVal)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      onChange(nextVal)
    }, debounceMs)
  }

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setInternalValue('')
    onChange('')
  }

  return (
    <div className="search-bar">
      <div className="search-bar__control">
        <SearchIcon size={16} className="search-bar__icon" aria-hidden="true" />
        <input
          type="text"
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="search-bar__input"
          aria-label="Search webhooks"
        />
        {internalValue && (
          <button
            type="button"
            onClick={handleClear}
            className="search-bar__clear-btn"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
