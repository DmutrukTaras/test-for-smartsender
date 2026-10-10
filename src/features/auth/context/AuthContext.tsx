import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User } from '../../../api/types'
import { authApi } from '../auth.api'
import { clearLocalSession, setDeviceSessionToken } from '../../../api/session'
import { ensureCsrfToken } from '../../../api/csrf'
import { setSessionExpiredListener } from '../../../api/interceptors'
import { queryClient } from '../../../app/query-client'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthContextType {
  user: User | null
  status: AuthStatus
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')

  const clearAuthState = useCallback(() => {
    clearLocalSession()
    // Cancel in-flight queries so delayed responses do not restore user state
    queryClient.cancelQueries()
    queryClient.clear()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  // Manual logout from UI
  const handleLogout = useCallback(async () => {
    try {
      await authApi.revokeSession()
    } catch {
      // Ignore network errors when revoking session during logout
    } finally {
      clearAuthState()
    }
  }, [clearAuthState])

  // Listen to session expiry from interceptor (on failed rotate or secondary 401)
  useEffect(() => {
    setSessionExpiredListener(() => {
      // Clean up local auth state only; do NOT send another redundant revoke request
      clearAuthState()
    })
    return () => {
      setSessionExpiredListener(null)
    }
  }, [clearAuthState])

  // Initial check on mount
  useEffect(() => {
    let isMounted = true
    const checkSession = async () => {
      try {
        // Step 1: Ensure CSRF token is fetched before any other API requests
        await ensureCsrfToken()

        // Step 2: Check session validity with /v1/me
        const me = await authApi.getMe()
        if (isMounted) {
          setUser(me)
          setStatus('authenticated')
        }
      } catch {
        if (isMounted) {
          clearAuthState()
        }
      }
    }
    checkSession()
    return () => {
      isMounted = false
    }
  }, [clearAuthState])

  const handleLogin = useCallback(async (credentials: { email: string; password: string }) => {
    // 1. Post login -> get device_session_token (stored in memory)
    const { device_session_token } = await authApi.login(credentials)

    try {
      // 2. Exchange device_session_token -> starts HttpOnly-like session
      await authApi.issueToken(device_session_token)

      // 3. Fetch user profile
      const me = await authApi.getMe()

      setUser(me)
      setStatus('authenticated')
    } finally {
      // 4. Guarantee that device_session_token is always cleared from memory even if issue or getMe fails
      setDeviceSessionToken(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
