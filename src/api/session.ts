const FINGERPRINT_STORAGE_KEY = 'ss_device_fingerprint'

let fallbackMemoryFingerprint: string | null = null
let inMemoryDeviceSessionToken: string | null = null
let sessionVersion = 0

function generate32Hex(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Fallback if crypto.getRandomValues is not available
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += Math.floor(Math.random() * 16).toString(16)
  }
  return result
}

export function getFingerprint(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(FINGERPRINT_STORAGE_KEY)
      if (stored && /^[0-9a-fA-F]{32}$/.test(stored)) {
        return stored
      }
      const generated = generate32Hex()
      window.localStorage.setItem(FINGERPRINT_STORAGE_KEY, generated)
      return generated
    } catch {
      // In case localStorage is blocked
    }
  }

  if (!fallbackMemoryFingerprint) {
    fallbackMemoryFingerprint = generate32Hex()
  }
  return fallbackMemoryFingerprint
}

export function getDeviceSessionToken(): string | null {
  return inMemoryDeviceSessionToken
}

export function setDeviceSessionToken(token: string | null): void {
  inMemoryDeviceSessionToken = token
}

export function getSessionVersion(): number {
  return sessionVersion
}

export function incrementSessionVersion(): number {
  sessionVersion += 1
  return sessionVersion
}

export function clearLocalSession(): void {
  inMemoryDeviceSessionToken = null
  sessionVersion += 1
}
