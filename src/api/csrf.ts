import axios from 'axios'

let currentCsrfToken: string | null = null
let pendingCsrfPromise: Promise<string> | null = null

const defaultBaseURL = typeof window !== 'undefined' ? '' : 'http://localhost'

export function getCsrfToken(): string | null {
  return currentCsrfToken
}

export function setCsrfToken(token: string | null): void {
  currentCsrfToken = token
}

export function clearCsrfToken(): void {
  currentCsrfToken = null
  pendingCsrfPromise = null
}

export async function fetchCsrfToken(baseURL = defaultBaseURL): Promise<string> {
  if (pendingCsrfPromise) {
    return pendingCsrfPromise
  }

  const effectiveBase = baseURL || defaultBaseURL

  pendingCsrfPromise = (async () => {
    try {
      const response = await axios.get(`${effectiveBase}/csrf`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      const tokenHeader =
        response.headers['x-csrf-token'] ||
        response.headers['X-CSRF-TOKEN'] ||
        (typeof response.headers?.get === 'function'
          ? response.headers.get('x-csrf-token') || response.headers.get('X-CSRF-TOKEN')
          : null)

      if (tokenHeader && typeof tokenHeader === 'string') {
        currentCsrfToken = tokenHeader
        return tokenHeader
      }

      throw new Error('CSRF token was not found in response headers')
    } finally {
      pendingCsrfPromise = null
    }
  })()

  return pendingCsrfPromise
}

export async function ensureCsrfToken(baseURL = defaultBaseURL): Promise<string> {
  if (currentCsrfToken) {
    return currentCsrfToken
  }
  return fetchCsrfToken(baseURL)
}
