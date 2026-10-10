import React from 'react'
import './Spinner.css'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label = 'Loading...' }) => {
  return (
    <div className={`spinner spinner--${size}`} role="status" aria-label={label}>
      <div className="spinner__circle" />
      <span className="spinner__sr-text">{label}</span>
    </div>
  )
}
