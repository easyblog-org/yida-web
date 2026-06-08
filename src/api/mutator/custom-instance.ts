import { queryClient } from '@/libs/query-client'
import { router } from '@/libs/router'
import { useAuthSessionStore } from '@/stores/auth-session'
import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

/** 匹配七牛云 CDN 地址（HTTP 或 HTTPS，任意子域名），统一替换为 /cdn-proxy 代理路径 */
const CDN_PATTERN = /^https?:\/\/[a-z0-9]+\.hn-bkt\.clouddn\.com/

/** 递归转换响应数据中的 HTTP CDN URL 为 /cdn-proxy 代理路径
 * 生产环境通过 Vercel rewrite 代理到 HTTP CDN，避免 HTTPS 页面的 Mixed Content 问题
 * 仅在数据发生变更时才创建新对象，避免不必要的对象拷贝 */
export function proxyCdnUrls<T>(data: T): T {
  if (typeof data === 'string') {
    if (CDN_PATTERN.test(data)) {
      return data.replace(CDN_PATTERN, '/cdn-proxy') as T
    }
    return data
  }
  if (Array.isArray(data)) {
    let changed = false
    const result = data.map((item) => {
      const newItem = proxyCdnUrls(item)
      if (newItem !== item) changed = true
      return newItem
    })
    return changed ? (result as T) : data
  }
  if (data && typeof data === 'object') {
    let changed = false
    const result = {} as Record<string, unknown>
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const newValue = proxyCdnUrls(value)
      if (newValue !== value) {
        changed = true
      }
      result[key] = newValue
    }
    return changed ? (result as T) : data
  }
  return data
}

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export const AXIOS_INSTANCE = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
})

// 请求拦截器
AXIOS_INSTANCE.interceptors.request.use(
  // 请求发送前执行
  (config) => {
    // orval 生成的请求都会走同一个 mutator，因此在这里统一注入 access token。
    const accessToken = useAuthSessionStore.getState().accessToken

    if (!accessToken) {
      return config
    }

    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`

    return config
  },
  // 请求拦截器内部抛出异常时执行
  (error) => {
    console.error('[HTTP Request Error]', error)
    return Promise.reject(error)
  },
)

// 响应拦截器
AXIOS_INSTANCE.interceptors.response.use(
  // 收到成功响应（HTTP 状态码 2xx）时执行
  (response) => {
    if (response.config.responseType === 'blob') {
      return response
    }

    const responseData = response.data as ApiResponse

    if (responseData.code !== 20000) {
      if (responseData.code === 40100) {
        useAuthSessionStore.getState().clearSession()
        queryClient.clear()

        if (router.state.location.pathname !== '/auth/login') {
          router.navigate({
            to: '/auth/login',
            replace: true,
          })
        }
      }

      return Promise.reject(responseData)
    }

    return response
  },
  // 收到错误响应或请求失败时执行
  (error) => {
    const responseData = error.response?.data as ApiResponse | undefined

    if (responseData?.code === 40100) {
      useAuthSessionStore.getState().clearSession()
      queryClient.clear()

      if (router.state.location.pathname !== '/auth/login') {
        router.navigate({
          to: '/auth/login',
          replace: true,
        })
      }
    }

    console.error('[HTTP Error]', error)

    return Promise.reject(responseData ?? error)
  },
)

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  // orval 期望 mutator 直接返回 response.data，这里统一展开一层。
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
  }).then(({ data }: AxiosResponse<T>) => proxyCdnUrls(data))

  return promise
}
