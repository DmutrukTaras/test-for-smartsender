import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { mockDb, FIXED_USER } from '../mocks/db'
import { apiClient } from '../api/client'
import { clearLocalSession, getFingerprint } from '../api/session'
import { clearCsrfToken } from '../api/csrf'
import { resetRotateLockForTesting, setSessionExpiredListener } from '../api/interceptors'

describe('Auth Concurrency, Rotate Lock & CSRF Recovery', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    server.resetHandlers()
    server.events.removeAllListeners()
    mockDb.reset()
    clearLocalSession()
    clearCsrfToken()
    resetRotateLockForTesting()
    setSessionExpiredListener(null)
  })

  it('handles two concurrent 401 requests with deterministic Promise gate, exactly one rotate call, and successful retries', async () => {
    const fingerprint = getFingerprint()
    // Setup active session tied to this device fingerprint and expire it immediately
    mockDb.startDirectSession(fingerprint)
    mockDb.expireSessionNow()

    let rotateCallCount = 0

    // Deterministic Promise gate: hold rotate until both 401 requests have hit the server
    let releaseRotateGate: () => void
    const rotateGatePromise = new Promise<void>((resolve) => {
      releaseRotateGate = resolve
    })

    // Custom rotate handler using Promise gate
    server.use(
      http.post('*/auth/token/rotate', async ({ request }) => {
        rotateCallCount++
        const body = (await request.json().catch(() => ({}))) as { fingerprint?: string }
        mockDb.rotateSession(body.fingerprint || '')

        // Wait for deterministic gate release
        await rotateGatePromise

        return HttpResponse.json({ message: 'Session rotated successfully.' }, { status: 200 })
      })
    )

    // Fire two concurrent requests while session is expired
    const request1 = apiClient.get('/v1/me')
    const request2 = apiClient.get('/v1/webhooks?page=1&limit=10')

    // Allow both requests to reach 401 and converge on the shared rotate promise
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Now release the gate to let rotate complete
    releaseRotateGate!()

    const [response1, response2] = await Promise.all([request1, request2])

    // Verification:
    // Exactly ONE rotate request was made across both parallel requests
    expect(rotateCallCount).toBe(1)

    // Both requests recovered and succeeded upon retry
    expect(response1.status).toBe(200)
    expect(response1.data.email).toBe(FIXED_USER.email)

    expect(response2.status).toBe(200)
    expect(response2.data.data.length).toBe(10)
    expect(response2.data.paging.pages.current).toBe(1)
  })

  it('terminates local session and notifies listener if rotate returns 400', async () => {
    const expiredListener = vi.fn()
    setSessionExpiredListener(expiredListener)

    const fingerprint = getFingerprint()
    mockDb.startDirectSession(fingerprint)
    mockDb.revokeSession()

    await expect(apiClient.get('/v1/me')).rejects.toThrow()
    expect(expiredListener).toHaveBeenCalledTimes(1)
  })

  it('automatically recovers from 419 CSRF mismatch by re-fetching token and retrying request', async () => {
    const fingerprint = getFingerprint()
    mockDb.startDirectSession(fingerprint)

    let putAttemptCount = 0
    let csrfFetchCount = 0

    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/csrf') && request.method === 'GET') {
        csrfFetchCount++
      }
    })

    // Intercept PUT: 1st attempt returns 419 TokenMismatchException, 2nd attempt succeeds with 200
    server.use(
      http.put('*/v1/webhooks/:id', async ({ params }) => {
        putAttemptCount++
        if (putAttemptCount === 1) {
          return HttpResponse.json(
            {
              error: {
                type: 'TokenMismatchException',
                message: 'CSRF token mismatch or expired.',
              },
            },
            { status: 419 }
          )
        }

        return HttpResponse.json(
          {
            id: params.id,
            name: 'Updated Webhook Name',
            url: 'https://example.com/webhook',
            active: true,
            created_at: new Date().toISOString(),
          },
          { status: 200 }
        )
      })
    )

    const response = await apiClient.put('/v1/webhooks/wh_001', {
      name: 'Updated Webhook Name',
      url: 'https://example.com/webhook',
    })

    // Verification:
    // Exactly two attempts were made (original failed with 419, retry succeeded with 200)
    expect(putAttemptCount).toBe(2)
    // CSRF token was re-fetched
    expect(csrfFetchCount).toBeGreaterThanOrEqual(1)
    expect(response.status).toBe(200)
    expect(response.data.name).toBe('Updated Webhook Name')
  })
})
