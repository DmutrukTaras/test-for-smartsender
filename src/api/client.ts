import axios from 'axios'
import { setupInterceptors } from './interceptors'

const defaultBaseURL = typeof window !== 'undefined' ? '' : 'http://localhost'

export const apiClient = axios.create({
  baseURL: defaultBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

setupInterceptors(apiClient)
