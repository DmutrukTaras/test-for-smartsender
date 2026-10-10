import { Webhook, User } from '../api/types'

export const FIXED_USER: User = {
  id: 'usr_smart_01',
  email: 'admin@smartsender.com',
  first_name: 'Admin',
  last_name: 'SmartSender',
  name: 'Admin SmartSender',
}

export const FIXED_PASSWORD = 'password123'
export const FIXED_CSRF_TOKEN = 'mock-csrf-token-secret-123'

const INITIAL_WEBHOOKS: Webhook[] = Array.from({ length: 28 }, (_, index) => {
  const num = index + 1
  return {
    id: `wh_${num.toString().padStart(3, '0')}`,
    name: `Webhook Service ${num}${num % 3 === 0 ? ' - Payments' : num % 2 === 0 ? ' - Notifications' : ' - Leads'}`,
    url: `https://api.example.com/webhooks/v1/event-${num}`,
    active: num % 4 !== 0,
    created_at: new Date(Date.now() - (28 - index) * 86400000).toISOString(),
  }
})

export interface MockSessionState {
  isIssued: boolean
  isRevoked: boolean
  expiresAt: number
  deviceSessionToken: string | null
  fingerprint: string | null
  rotateDelayMs: number
}

interface PendingDeviceToken {
  fingerprint: string
  createdAt: number
}

class MockDatabase {
  public user: User = { ...FIXED_USER }
  public webhooks: Webhook[] = JSON.parse(JSON.stringify(INITIAL_WEBHOOKS))
  public pendingTokens: Map<string, PendingDeviceToken> = new Map()

  public session: MockSessionState = {
    isIssued: false,
    isRevoked: false,
    expiresAt: 0,
    deviceSessionToken: null,
    fingerprint: null,
    rotateDelayMs: 0,
  }

  public reset() {
    this.user = { ...FIXED_USER }
    this.webhooks = JSON.parse(JSON.stringify(INITIAL_WEBHOOKS))
    this.pendingTokens.clear()
    this.session = {
      isIssued: false,
      isRevoked: false,
      expiresAt: 0,
      deviceSessionToken: null,
      fingerprint: null,
      rotateDelayMs: 0,
    }
  }

  public setRotateDelay(ms: number) {
    this.session.rotateDelayMs = ms
  }

  public registerPendingToken(token: string, fingerprint: string) {
    this.pendingTokens.set(token, {
      fingerprint,
      createdAt: Date.now(),
    })
  }

  public startSession(token: string, fingerprint: string): boolean {
    const pending = this.pendingTokens.get(token)
    // Validate that token was actually issued by /auth/login and belongs to the same fingerprint
    if (!pending || pending.fingerprint !== fingerprint) {
      return false
    }

    // Consume the one-time device session token
    this.pendingTokens.delete(token)

    this.session.isIssued = true
    this.session.isRevoked = false
    this.session.deviceSessionToken = token
    this.session.fingerprint = fingerprint
    this.session.expiresAt = Date.now() + 30000
    return true
  }

  // Helper for tests to initialize an active session directly
  public startDirectSession(fingerprint: string) {
    this.session.isIssued = true
    this.session.isRevoked = false
    this.session.deviceSessionToken = 'direct_test_token'
    this.session.fingerprint = fingerprint
    this.session.expiresAt = Date.now() + 30000
  }

  public expireSessionNow() {
    this.session.expiresAt = Date.now() - 1000
  }

  public rotateSession(fingerprint: string): boolean {
    // Before issue or after revoke, or if fingerprint doesn't match session, rotate fails (400)
    if (!this.session.isIssued || this.session.isRevoked) {
      return false
    }
    if (this.session.fingerprint && this.session.fingerprint !== fingerprint) {
      return false
    }
    this.session.expiresAt = Date.now() + 30000
    return true
  }

  public revokeSession() {
    this.session.isRevoked = true
    this.session.expiresAt = 0
    this.session.deviceSessionToken = null
    this.session.fingerprint = null
  }

  public isSessionValid(): boolean {
    if (!this.session.isIssued || this.session.isRevoked) {
      return false
    }
    return Date.now() <= this.session.expiresAt
  }
}

export const mockDb = new MockDatabase()
