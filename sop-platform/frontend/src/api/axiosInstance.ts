import axios from 'axios'
import { getToken, setToken, getRefreshToken, clearToken } from '../utils/tokenHelpers'

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(undefined)))
  failedQueue = []
}

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 300000,
  withCredentials: true,
})

axiosInstance.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (
      error.response?.status === 401 &&
      !original._retried &&
      original.url !== '/auth/refresh' &&
      original.url !== '/auth/login'
    ) {
      original._retried = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then(() => axiosInstance(original))
          .catch(Promise.reject.bind(Promise))
      }

      isRefreshing = true
      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) throw new Error('No refresh token')

        const res = await axiosInstance.post('/auth/refresh', null, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
        const newToken = res.data?.data?.access_token
        if (newToken) {
          setToken(newToken)
          original.headers.Authorization = `Bearer ${newToken}`
        }
        processQueue(null)
        return axiosInstance(original)
      } catch (refreshError) {
        processQueue(refreshError)
        clearToken()
        if (window.location.pathname !== '/login') window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
