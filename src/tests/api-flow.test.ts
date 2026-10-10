import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { server } from '../mocks/server'
import { mockDb, FIXED_USER, FIXED_PASSWORD } from '../mocks/db'
import { authApi } from '../features/auth/auth.api'
import { webhooksApi } from '../features/webhooks/webhooks.api'
import { clearLocalSession, getFingerprint } from '../api/session'
import { clearCsrfToken } from '../api/csrf'
import { isAxiosError } from 'axios'
import { ApiErrorResponse } from '../api/types'

describe('Auth & Webhooks End-to-End API Flows', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    server.resetHandlers()
    mockDb.reset()
    clearLocalSession()
    clearCsrfToken()
  })

  it('completes the entire login, issue token, and getMe cycle', async () => {
    // 1. Login
    const loginRes = await authApi.login({
      email: FIXED_USER.email,
      password: FIXED_PASSWORD,
    })
    expect(loginRes.device_session_token).toBeDefined()

    // 2. Issue session token (exchanges one-time token)
    await authApi.issueToken(loginRes.device_session_token)

    // 3. Get profile
    const profile = await authApi.getMe()
    expect(profile.id).toBe(FIXED_USER.id)
    expect(profile.email).toBe(FIXED_USER.email)

    // 4. Verify that trying to re-use the same device_session_token fails with 422
    try {
      await authApi.issueToken(loginRes.device_session_token)
      expect.unreachable('Should fail with 422 when reusing consumed token')
    } catch (err) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        expect(err.response?.status).toBe(422)
      }
    }
  })

  it('rejects unissued or fake device_session_token with 422', async () => {
    try {
      await authApi.issueToken('fake_unregistered_token')
      expect.unreachable('Should fail with 422')
    } catch (err) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        expect(err.response?.status).toBe(422)
        expect(err.response?.data.error.payload?.device_session_token).toBeDefined()
      }
    }
  })

  it('returns 422 with field error payload on invalid login credentials', async () => {
    try {
      await authApi.login({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      })
      expect.unreachable('Should have thrown 422 error')
    } catch (err) {
      expect(isAxiosError(err)).toBe(true)
      if (isAxiosError<ApiErrorResponse>(err)) {
        expect(err.response?.status).toBe(422)
        expect(err.response?.data.error.type).toBe('ValidationException')
        expect(err.response?.data.error.payload?.email).toBeDefined()
      }
    }
  })

  it('filters webhooks by search query and calculates pagination correctly', async () => {
    const fingerprint = getFingerprint()
    mockDb.startDirectSession(fingerprint)

    const list = await webhooksApi.getWebhooks({ page: 1, limit: 10, search: 'Payments' })
    expect(list.data.length).toBeGreaterThan(0)
    for (const item of list.data) {
      expect(item.name.toLowerCase()).toContain('payments')
    }
    expect(list.paging.pages.current).toBe(1)
  })

  it('updates webhook and rejects invalid URL with 422', async () => {
    const fingerprint = getFingerprint()
    mockDb.startDirectSession(fingerprint)

    // Valid update
    const updated = await webhooksApi.updateWebhook('wh_001', {
      name: 'Custom Webhook Title',
      url: 'https://newdomain.com/hook',
    })
    expect(updated.name).toBe('Custom Webhook Title')
    expect(updated.url).toBe('https://newdomain.com/hook')

    // Invalid URL update
    try {
      await webhooksApi.updateWebhook('wh_001', {
        name: 'Custom Webhook Title',
        url: 'invalid-url-string',
      })
      expect.unreachable('Should have thrown 422')
    } catch (err) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        expect(err.response?.status).toBe(422)
        expect(err.response?.data.error.payload?.url).toBeDefined()
      }
    }
  })
})
