export interface Webhook {
  id: string
  name: string
  url: string
  active: boolean
  created_at: string
}

export interface WebhookList {
  data: Webhook[]
  paging: {
    pages: {
      current: number
      last: number
    }
    results: {
      total: number
      limitation: number
    }
  }
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  name: string
}

export interface LoginRequest {
  email: string
  password: string
  fingerprint: string
}

export interface LoginResponse {
  device_session_token: string
}

export interface IssueTokenRequest {
  device_session_token: string
  fingerprint: string
}

export interface FingerprintRequest {
  fingerprint: string
}

export interface UpdateWebhookRequest {
  name: string
  url: string
}

export type ApiErrorType =
  | 'BadRequestException'
  | 'AuthenticationException'
  | 'NotFoundException'
  | 'TokenMismatchException'
  | 'ValidationException'

export interface ApiErrorResponse {
  error: {
    type: ApiErrorType
    message: string
    payload?: Record<string, string[]>
  }
}
