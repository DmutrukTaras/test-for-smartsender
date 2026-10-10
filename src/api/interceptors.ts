import { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import {
  getFingerprint,
  getSessionVersion,
  incrementSessionVersion,
  clearLocalSession,
} from './session'
import { ensureCsrfToken, fetchCsrfToken } from './csrf'

// Extend Axios request configuration types
declare module 'axios' {
  export interface AxiosRequestConfig {
    __authRetried?: boolean
    __csrfRetried?: boolean
    __isRotateRequest?: boolean
    __sessionVersion?: number
  }
}

let activeRotatePromise: Promise<void> | null = null
let sessionExpiredListener: (() => void) | null = null

export function setSessionExpiredListener(listener: (() => void) | null): void {
  sessionExpiredListener = listener
}

export function resetRotateLockForTesting(): void {
  activeRotatePromise = null
}

export function setupInterceptors(client: AxiosInstance): void {
  // Request Interceptor
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // 1. All requests include X-Requested-With
    config.headers.set('X-Requested-With', 'XMLHttpRequest')

    // 2. Attach current session version to detect late 401s
    if (config.__sessionVersion === undefined) {
      config.__sessionVersion = getSessionVersion()
    }

    // 3. For POST and PUT, ensure and attach X-CSRF-TOKEN
    const method = config.method?.toUpperCase()
    if (method === 'POST' || method === 'PUT') {
      const csrf = await ensureCsrfToken(config.baseURL)
      config.headers.set('X-CSRF-TOKEN', csrf)
    }

    return config
  })

  // Response Interceptor
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalConfig = error.config as InternalAxiosRequestConfig | undefined
      const status = error.response?.status

      if (!originalConfig) {
        return Promise.reject(error)
      }

      // Handle 419 (CSRF TokenMismatchException)
      if (status === 419 && !originalConfig.__csrfRetried) {
        originalConfig.__csrfRetried = true
        try {
          const freshCsrf = await fetchCsrfToken(originalConfig.baseURL)
          originalConfig.headers.set('X-CSRF-TOKEN', freshCsrf)
          return client(originalConfig)
        } catch (csrfErr) {
          return Promise.reject(csrfErr)
        }
      }

      // Handle 401 (AuthenticationException)
      if (status === 401) {
        // Do not intercept if it's the rotate request itself
        if (originalConfig.__isRotateRequest) {
          return Promise.reject(error)
        }

        // If request was already retried for auth, terminate local session
        if (originalConfig.__authRetried) {
          clearLocalSession()
          sessionExpiredListener?.()
          return Promise.reject(error)
        }

        // If session was already rotated by another parallel request while this request was in-flight
        if (originalConfig.__sessionVersion !== undefined && getSessionVersion() > originalConfig.__sessionVersion) {
          originalConfig.__authRetried = true
          originalConfig.__sessionVersion = getSessionVersion()
          return client(originalConfig)
        }

        // Perform or wait for shared rotate call
        try {
          if (!activeRotatePromise) {
            activeRotatePromise = (async () => {
              try {
                const csrf = await ensureCsrfToken(originalConfig.baseURL)
                const fingerprint = getFingerprint()

                // Call rotate with __isRotateRequest flag so it won't trigger another rotate
                await client.post(
                  '/auth/token/rotate',
                  { fingerprint },
                  {
                    __isRotateRequest: true,
                    headers: {
                      'X-CSRF-TOKEN': csrf,
                    },
                  }
                )

                incrementSessionVersion()
              } finally {
                activeRotatePromise = null
              }
            })()
          }

          await activeRotatePromise

          // Retry the original request once
          originalConfig.__authRetried = true
          originalConfig.__sessionVersion = getSessionVersion()
          return client(originalConfig)
        } catch (rotateErr) {
          clearLocalSession()
          sessionExpiredListener?.()
          return Promise.reject(rotateErr)
        }
      }

      return Promise.reject(error)
    }
  )
}
