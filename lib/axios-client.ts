import axios from 'axios'

/**
 * Browser-only Axios instance that attaches `Authorization: Bearer <token>`
 * from `localStorage.auth_token`.
 */
export const clientApiAxios = axios.create()

clientApiAxios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('auth_token')
    if (token) {
      config.headers = config.headers ?? {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

clientApiAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined') {
      const status = err?.response?.status
      if (status === 401) {
        window.localStorage.removeItem('auth_token')
      }
    }
    return Promise.reject(err)
  }
)

