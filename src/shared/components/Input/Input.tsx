import React, { forwardRef } from 'react'
import './Input.css'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', disabled, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    const blockClasses = [
      'form-field',
      error ? 'form-field--error' : '',
      disabled ? 'form-field--disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={blockClasses}>
        {label && (
          <label className="form-field__label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="form-field__control">
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className="form-field__input"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
        {error && (
          <span className="form-field__error" id={`${inputId}-error`} role="alert">
            {error}
          </span>
        )}
        {!error && hint && <span className="form-field__hint">{hint}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
