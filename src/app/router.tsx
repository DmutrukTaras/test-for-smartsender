import React from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'
import { LoginForm } from '../features/auth/components/LoginForm/LoginForm'
import { WebhooksView } from '../features/webhooks/components/WebhooksView/WebhooksView'
import { Spinner } from '../shared/components/Spinner/Spinner'

const FullPageLoader: React.FC = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
    }}
  >
    <Spinner size="lg" label="Checking session..." />
  </div>
)

const ProtectedLayout: React.FC = () => {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') {
    return <FullPageLoader />
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname + location.search,
        }}
        replace
      />
    )
  }

  return <Outlet />
}

const PublicLayout: React.FC = () => {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') {
    return <FullPageLoader />
  }

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    const redirectTo =
      from?.startsWith('/webhooks') &&
      (from.length === '/webhooks'.length || ['?', '#'].includes(from['/webhooks'.length]))
        ? from
        : '/webhooks'

    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}

const RootRedirect: React.FC = () => {
  const { status } = useAuth()

  if (status === 'checking') {
    return <FullPageLoader />
  }

  return <Navigate to={status === 'authenticated' ? '/webhooks' : '/login'} replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/login',
        element: <LoginForm />,
      },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/webhooks',
        element: <WebhooksView />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/webhooks" replace />,
  },
])
