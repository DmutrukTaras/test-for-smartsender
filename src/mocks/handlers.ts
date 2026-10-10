import { http, HttpResponse, delay } from 'msw'
import {
  mockDb,
  FIXED_USER,
  FIXED_PASSWORD,
  FIXED_CSRF_TOKEN,
} from './db'
import { LoginRequest, IssueTokenRequest, UpdateWebhookRequest } from '../api/types'

function validateCsrf(request: Request): Response | null {
  const method = request.method.toUpperCase()
  if (method === 'POST' || method === 'PUT') {
    const token = request.headers.get('X-CSRF-TOKEN')
    if (!token || token !== FIXED_CSRF_TOKEN) {
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
  }
  return null
}

function isValidHttpUrl(stringUrl: string): boolean {
  try {
    const parsed = new URL(stringUrl)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const handlers = [
  // GET /csrf
  http.get('*/csrf', () => {
    return new HttpResponse(null, {
      status: 204,
      headers: {
        'X-CSRF-TOKEN': FIXED_CSRF_TOKEN,
      },
    })
  }),

  // POST /auth/login
  http.post('*/auth/login', async ({ request }) => {
    const csrfError = validateCsrf(request)
    if (csrfError) return csrfError

    const captcha = request.headers.get('X-Captcha-Token')
    if (!captcha || captcha.trim() === '') {
      return HttpResponse.json(
        {
          error: {
            type: 'ValidationException',
            message: 'The given data was invalid.',
            payload: { captcha: ['Captcha token is required.'] },
          },
        },
        { status: 422 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as Partial<LoginRequest>
    const { email, password, fingerprint } = body

    const errors: Record<string, string[]> = {}
    if (!email) errors.email = ['The email field is required.']
    if (!password) errors.password = ['The password field is required.']
    if (!fingerprint) errors.fingerprint = ['Fingerprint is required.']

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json(
        {
          error: {
            type: 'ValidationException',
            message: 'The given data was invalid.',
            payload: errors,
          },
        },
        { status: 422 }
      )
    }

    if (email !== FIXED_USER.email || password !== FIXED_PASSWORD) {
      return HttpResponse.json(
        {
          error: {
            type: 'ValidationException',
            message: 'The given data was invalid.',
            payload: {
              email: ['Invalid email or password.'],
              password: ['Invalid email or password.'],
            },
          },
        },
        { status: 422 }
      )
    }

    const deviceSessionToken =
      'dst_' + Math.random().toString(36).slice(2) + Date.now().toString(36)

    mockDb.registerPendingToken(deviceSessionToken, fingerprint!)

    return HttpResponse.json(
      {
        device_session_token: deviceSessionToken,
      },
      { status: 200 }
    )
  }),

  // POST /auth/token/issue
  http.post('*/auth/token/issue', async ({ request }) => {
    const csrfError = validateCsrf(request)
    if (csrfError) return csrfError

    const body = (await request.json().catch(() => ({}))) as Partial<IssueTokenRequest>
    const { device_session_token, fingerprint } = body

    const errors: Record<string, string[]> = {}
    if (!device_session_token) {
      errors.device_session_token = ['The device_session_token is required.']
    }
    if (!fingerprint) {
      errors.fingerprint = ['The fingerprint is required.']
    }

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json(
        {
          error: {
            type: 'ValidationException',
            message: 'The given data was invalid.',
            payload: errors,
          },
        },
        { status: 422 }
      )
    }

    const sessionStarted = mockDb.startSession(device_session_token!, fingerprint!)
    if (!sessionStarted) {
      return HttpResponse.json(
        {
          error: {
            type: 'ValidationException',
            message: 'The given data was invalid.',
            payload: {
              device_session_token: ['The device session token is invalid or has already been used.'],
            },
          },
        },
        { status: 422 }
      )
    }

    return HttpResponse.json(
      { message: 'Session started successfully.' },
      { status: 200 }
    )
  }),

  // POST /auth/token/rotate
  http.post('*/auth/token/rotate', async ({ request }) => {
    const csrfError = validateCsrf(request)
    if (csrfError) return csrfError

    const body = (await request.json().catch(() => ({}))) as { fingerprint?: string }
    const fingerprint = body?.fingerprint || ''

    if (mockDb.session.rotateDelayMs > 0) {
      await delay(mockDb.session.rotateDelayMs)
    }

    const success = mockDb.rotateSession(fingerprint)
    if (!success) {
      return HttpResponse.json(
        {
          error: {
            type: 'BadRequestException',
            message: 'Session cannot be rotated.',
          },
        },
        { status: 400 }
      )
    }

    return HttpResponse.json(
      { message: 'Session rotated successfully.' },
      { status: 200 }
    )
  }),

  // POST /auth/token/revoke
  http.post('*/auth/token/revoke', async ({ request }) => {
    const csrfError = validateCsrf(request)
    if (csrfError) return csrfError

    mockDb.revokeSession()
    return new HttpResponse(null, { status: 204 })
  }),

  // GET /v1/me
  http.get('*/v1/me', () => {
    if (!mockDb.isSessionValid()) {
      return HttpResponse.json(
        {
          error: {
            type: 'AuthenticationException',
            message: 'Unauthenticated.',
          },
        },
        { status: 401 }
      )
    }

    return HttpResponse.json(mockDb.user, { status: 200 })
  }),

  // GET /v1/webhooks
  http.get('*/v1/webhooks', ({ request }) => {
    if (!mockDb.isSessionValid()) {
      return HttpResponse.json(
        {
          error: {
            type: 'AuthenticationException',
            message: 'Unauthenticated.',
          },
        },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10)
    const search = (url.searchParams.get('search') || '').trim().toLowerCase()

    const filtered = mockDb.webhooks.filter((w) =>
      w.name.toLowerCase().includes(search)
    )

    const total = filtered.length
    const lastPage = Math.max(1, Math.ceil(total / limit))
    const startIndex = (page - 1) * limit
    const pageData = filtered.slice(startIndex, startIndex + limit)

    return HttpResponse.json(
      {
        data: pageData,
        paging: {
          pages: {
            current: page,
            last: lastPage,
          },
          results: {
            total,
            limitation: limit,
          },
        },
      },
      { status: 200 }
    )
  }),

  // GET /v1/webhooks/:id
  http.get('*/v1/webhooks/:id', ({ params }) => {
    if (!mockDb.isSessionValid()) {
      return HttpResponse.json(
        {
          error: {
            type: 'AuthenticationException',
            message: 'Unauthenticated.',
          },
        },
        { status: 401 }
      )
    }

    const { id } = params
    const item = mockDb.webhooks.find((w) => w.id === id)

    if (!item) {
      return HttpResponse.json(
        {
          error: {
            type: 'NotFoundException',
            message: 'Webhook not found.',
          },
        },
        { status: 404 }
      )
    }

    return HttpResponse.json(item, { status: 200 })
  }),

  // PUT /v1/webhooks/:id
  http.put('*/v1/webhooks/:id', async ({ request, params }) => {
    const csrfError = validateCsrf(request)
    if (csrfError) return csrfError

    if (!mockDb.isSessionValid()) {
      return HttpResponse.json(
        {
          error: {
            type: 'AuthenticationException',
            message: 'Unauthenticated.',
          },
        },
        { status: 401 }
      )
    }

    const { id } = params
    const item = mockDb.webhooks.find((w) => w.id === id)

    if (!item) {
      return HttpResponse.json(
        {
          error: {
            type: 'NotFoundException',
            message: 'Webhook not found.',
          },
        },
        { status: 404 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as Partial<UpdateWebhookRequest>
    const errors: Record<string, string[]> = {}

    if (!body.name || !body.name.trim()) {
      errors.name = ['The name field is required.']
    }

    if (!body.url || !body.url.trim()) {
      errors.url = ['The url field is required.']
    } else if (!isValidHttpUrl(body.url.trim())) {
      errors.url = ['The url must be a valid URL.']
    }

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json(
        {
          error: {
            type: 'ValidationException',
            message: 'The given data was invalid.',
            payload: errors,
          },
        },
        { status: 422 }
      )
    }

    item.name = body.name!.trim()
    item.url = body.url!.trim()

    return HttpResponse.json(item, { status: 200 })
  }),
]
