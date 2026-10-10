import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { loginSchema, LoginFormValues } from '../../schemas/login.schema'
import { useAuth } from '../../context/AuthContext'
import { Input } from '../../../../shared/components/Input/Input'
import { Button } from '../../../../shared/components/Button/Button'
import { ApiErrorResponse } from '../../../../api/types'
import { Lock, KeyRound } from 'lucide-react'
import './LoginForm.css'

export const LoginForm: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [generalError, setGeneralError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from
  const redirectTo =
    from?.startsWith('/webhooks') &&
    (from.length === '/webhooks'.length || ['?', '#'].includes(from['/webhooks'.length]))
      ? from
      : '/webhooks'

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const fillTestCredentials = () => {
    setValue('email', 'admin@smartsender.com', { shouldValidate: true })
    setValue('password', 'password123', { shouldValidate: true })
  }

  const onSubmit = async (values: LoginFormValues) => {
    setGeneralError(null)
    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorResponse>(err) && err.response?.data?.error) {
        const errorData = err.response.data.error

        // Map backend validation payload to form fields
        if (errorData.payload) {
          if (errorData.payload.email?.[0]) {
            setError('email', { message: errorData.payload.email[0] })
          }
          if (errorData.payload.password?.[0]) {
            setError('password', { message: errorData.payload.password[0] })
          }
        } else {
          setGeneralError(errorData.message || 'Authentication failed')
        }
      } else {
        setGeneralError('Network error or server unavailable. Please try again.')
      }
    }
  }

  return (
    <div className="login-view">
      <div className="login-view__card">
        <div className="login-view__header">
          <div className="login-view__icon-wrapper">
            <Lock size={24} className="login-view__icon" />
          </div>
          <h1 className="login-view__title">Smart Sender 2.0</h1>
          <p className="login-view__subtitle">Sign in to manage your webhooks and automation</p>
        </div>

        {generalError && (
          <div className="login-view__alert" role="alert">
            {generalError}
          </div>
        )}

        <form className="login-view__form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@smartsender.com"
            error={errors.email?.message}
            disabled={isSubmitting}
            autoComplete="email"
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={isSubmitting}
            autoComplete="current-password"
            {...register('password')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="login-view__submit-btn"
          >
            Sign In
          </Button>
        </form>

        <div className="login-view__test-info">
          <div className="login-view__test-header">
            <KeyRound size={14} />
            <span className="login-view__test-title">Test Credentials</span>
          </div>
          <div className="login-view__test-details">
            <div>
              <strong>Email:</strong> <code>admin@smartsender.com</code>
            </div>
            <div>
              <strong>Password:</strong> <code>password123</code>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={fillTestCredentials}
            className="login-view__autofill-btn"
          >
            Fill Credentials
          </Button>
        </div>
      </div>
    </div>
  )
}
