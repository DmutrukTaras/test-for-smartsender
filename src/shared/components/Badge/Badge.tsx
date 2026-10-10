import React from 'react'
import './Badge.css'

export interface BadgeProps {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}

export const Badge: React.FC<BadgeProps> = ({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
}) => {
  const modifier = active ? 'badge--active' : 'badge--inactive'

  return (
    <span className={`badge ${modifier}`}>
      <span className="badge__dot" aria-hidden="true" />
      <span className="badge__label">{active ? activeLabel : inactiveLabel}</span>
    </span>
  )
}
