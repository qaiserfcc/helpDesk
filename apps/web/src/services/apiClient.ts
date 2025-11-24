import axios from 'axios'
import { env } from './env'
import { getAuthSession } from '../store/authClient'

export const apiClient = axios.create({ baseURL: env.apiUrl, timeout: 10000 })

apiClient.interceptors.request.use((config) => {
  const session = getAuthSession()
  if (session?.accessToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${session.accessToken}`,
    }
  }
  return config
})

export default apiClient
