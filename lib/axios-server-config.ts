//! Not to be used in the client side

import axios from 'axios'

if (!process.env.R2_ACCOUNT_ID) { 
  throw new Error('R2_ACCOUNT_ID is not set')
}
const r2_base_url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/`


const r2Axios = axios.create({
  headers: {
    'Authorization': `Bearer ${process.env.R2_API_KEY}`
  },
  baseURL: r2_base_url,
})

/**
 * Axios instance for Python server API calls.
 * Use this for server-side requests to the Python chat/training server.
 */
const pythonApiAxios = axios.create({
  baseURL: process.env.PYTHON_API_URL || process.env.NEXT_PUBLIC_PYTHON_SERVER_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

/**
 * Makes an authenticated request to the Python server.
 * Automatically adds the Authorization header with the provided JWT token.
 */
export async function pythonApiRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  token: string,
  data?: unknown
): Promise<T> {
  const response = await pythonApiAxios.request<T>({
    method,
    url: endpoint,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  })
  return response.data
}

export { r2Axios, pythonApiAxios }