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
  }).then(({ data }: AxiosResponse<T>) => data)

  return promise
}
