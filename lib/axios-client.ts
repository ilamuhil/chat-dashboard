import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

/**
 * ! Browser-only Axios instance that attaches `Authorization: Bearer <token>`
 * ! from `localStorage.auth_token`.
 * ! Use this to communicate between the dashboard client and the dashboard server.
 * ! This is independent of the chat server
 */
export const clientApiAxios: AxiosInstance = axios.create()

clientApiAxios.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('auth_token')
    if (token) {
      config.headers = config.headers ?? {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const MAX_RETRIES = 3

type RetryConfig = InternalAxiosRequestConfig & { _retryCount?: number }
clientApiAxios.interceptors.response.use(
  res => res,
  async err => {
    const config = err?.config as RetryConfig | undefined
    if (!config) return Promise.reject(err)
    const status = err?.response?.status

    if (status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('auth_token')
    }
    if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') {
      return Promise.reject(err)
    }
    const shouldRetry = !err.response || (status >= 500 && status < 600)
    if (!shouldRetry) return Promise.reject(err)
    config._retryCount = config._retryCount ?? 0
    if (config._retryCount >= MAX_RETRIES) return Promise.reject(err)
    config._retryCount += 1
    await delay(100 * 2 ** config._retryCount)
    return clientApiAxios(config)
  },
)
