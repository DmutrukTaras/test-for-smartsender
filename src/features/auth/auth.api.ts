import { apiClient } from '../../api/client'
import { getFingerprint, setDeviceSessionToken } from '../../api/session'
import { User, LoginResponse } from '../../api/types'

export const authApi = {
  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    const fingerprint = getFingerprint()
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      {
        email: credentials.email,
        password: credentials.password,
        fingerprint,
      },
      {
        headers: {
          'X-Captcha-Token': 'smart-sender-verified-captcha',
        },
      }
    )

    // Save device session token in memory only
    setDeviceSessionToken(response.data.device_session_token)
    return response.data
  },

  async issueToken(deviceSessionToken: string): Promise<void> {
    const fingerprint = getFingerprint()
    await apiClient.post('/auth/token/issue', {
      device_session_token: deviceSessionToken,
      fingerprint,
    })
  },

  async revokeSession(): Promise<void> {
    const fingerprint = getFingerprint()
    await apiClient.post('/auth/token/revoke', { fingerprint })
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/v1/me')
    return response.data
  },
}
