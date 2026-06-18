import type { ChatStreamMessage } from '@/api/generated/models'
import { apiBaseUrl } from '@/api/mutator/custom-instance'
import { queryClient } from '@/libs/query-client'
import { router } from '@/libs/router'
import { useAuthSessionStore } from '@/stores/auth-session'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { App } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useWorkbenchRuntimeStore } from '../stores/useWorkbenchRuntimeStore'
import {
  createLocalAppConversationMessage,
  isAppChatStreamErrorContent,
  type AppConversationDisplayMessage,
} from '../utils/appConversationMessages'
import { getAppConversationMessagesQueryKey } from './useAppConversationMessages'

const APP_CHAT_PROMPT_MAX_LENGTH = 1000
const LOGIN_EXPIRED_CODE = 40100

type ApiErrorResponse = {
  code?: number
  message?: string
  data?: unknown
}

export function getAppChatStreamErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export async function readAppChatStreamErrorResponse(
  response: Response,
): Promise<ApiErrorResponse> {
  try {
    const errorBody = (await response.clone().json()) as ApiErrorResponse

    if (errorBody && typeof errorBody === 'object') {
      return errorBody
    }
  } catch {
    return {
      message: '聊天请求失败，请稍后重试。',
    }
  }

  return {
    message: '聊天请求失败，请稍后重试。',
  }
}

export function parseAppChatStreamMessage(eventData: string): ChatStreamMessage | null {
  const text = eventData.trim()

  if (!text) {
    return null
  }

  return JSON.parse(text) as ChatStreamMessage
}

export function useAppChatStream(appId?: string) {
  const { message } = App.useApp()
  const accessToken = useAuthSessionStore((state) => state.accessToken)
  const clearSession = useAuthSessionStore((state) => state.clearSession)
  const requestPreviewRefresh = useWorkbenchRuntimeStore((state) => state.requestPreviewRefresh)
  const setGenerating = useWorkbenchRuntimeStore((state) => state.setGenerating)
  const setSubmitting = useWorkbenchRuntimeStore((state) => state.setSubmitting)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessages, setStreamingMessages] = useState<AppConversationDisplayMessage[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const latestFailedPromptRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
      setIsStreaming(false)
      setStreamingMessages([])
      setGenerating(false)
      setSubmitting(false)
    }
  }, [setGenerating, setSubmitting])

  const handleLoginExpired = useCallback(() => {
    clearSession()
    queryClient.clear()
    void router.navigate({ to: '/auth/login', replace: true })
  }, [clearSession])

  const sendMessage = useCallback(
    (prompt: string) => {
      const nextPrompt = prompt.trim()

      if (!appId || isStreaming) {
        return false
      }

      if (!nextPrompt) {
        message.warning('请输入内容后发送')
        return false
      }

      if (nextPrompt.length > APP_CHAT_PROMPT_MAX_LENGTH) {
        message.warning(`需求描述不能超过 ${APP_CHAT_PROMPT_MAX_LENGTH} 个字符`)
        return false
      }

      if (!accessToken) {
        message.warning('请先登录后再发送消息')
        void router.navigate({ to: '/auth/login' })
        return false
      }

      const requestStartedAt = Date.now()
      const userMessageId = `local-user-${requestStartedAt}`
      const assistantMessageId = `local-assistant-${requestStartedAt}`
      const abortController = new AbortController()
      let assistantContent = ''
      let streamReturnedErrorContent = false

      abortControllerRef.current?.abort()
      abortControllerRef.current = abortController
      latestFailedPromptRef.current = null
      setIsStreaming(true)
      setGenerating(true)
      setSubmitting(true)
      setStreamingMessages([
        createLocalAppConversationMessage({
          id: userMessageId,
          role: 'user',
          content: nextPrompt,
        }),
        createLocalAppConversationMessage({
          id: assistantMessageId,
          role: 'assistant',
          status: 'generating',
        }),
      ])

      void (async () => {
        try {
          await fetchEventSource(`${apiBaseUrl}/apps/${appId}/chat-stream`, {
            method: 'POST',
            headers: {
              Accept: EventStreamContentType,
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ prompt: nextPrompt }),
            signal: abortController.signal,
            openWhenHidden: true,
            async onopen(response) {
              if (response.ok) {
                const contentType = response.headers.get('content-type') ?? ''

                if (!contentType.startsWith(EventStreamContentType)) {
                  const errorBody = await readAppChatStreamErrorResponse(response)

                  if (errorBody.code === LOGIN_EXPIRED_CODE) {
                    handleLoginExpired()
                  }

                  throw errorBody.message ? errorBody : new Error('聊天接口未返回有效的 SSE 流')
                }

                return
              }

              const errorBody = await readAppChatStreamErrorResponse(response)

              if (errorBody.code === LOGIN_EXPIRED_CODE) {
                handleLoginExpired()
              }

              throw errorBody
            },
            onmessage(event) {
              const streamMessage = parseAppChatStreamMessage(event.data)

              if (!streamMessage?.c) {
                return
              }

              assistantContent += streamMessage.c
              streamReturnedErrorContent = isAppChatStreamErrorContent(assistantContent)
              setStreamingMessages((messages) =>
                messages.map((item) =>
                  item.id === assistantMessageId
                    ? {
                      ...item,
                      content: `${item.content ?? ''}${streamMessage.c}`,
                    }
                    : item,
                ),
              )
            },
            onerror(error) {
              throw error
            },
          })

          if (!isMountedRef.current) {
            return
          }

          setStreamingMessages((messages) =>
            messages.map((item) =>
              item.id === assistantMessageId
                ? {
                  ...item,
                  status: streamReturnedErrorContent ? 'failed' : 'completed',
                }
                : item,
            ),
          )

          if (streamReturnedErrorContent) {
            latestFailedPromptRef.current = nextPrompt
            return
          }

          if (isMountedRef.current) {
            requestPreviewRefresh()
          }

          try {
            await queryClient.refetchQueries({
              queryKey: getAppConversationMessagesQueryKey(appId),
              type: 'active',
            })

            if (isMountedRef.current) {
              setStreamingMessages([])
            }
          } catch {
            message.warning('消息已生成，但刷新消息列表失败，请稍后手动刷新。')
          }
        } catch (error) {
          if (!isMountedRef.current || abortController.signal.aborted) {
            return
          }

          // SSE 流可能已正常输出全部内容，但连接关闭时抛出异常（如服务端主动断开）。
          // 此时已有内容，不应标记为失败，按正常完成处理。
          if (assistantContent.trim()) {
            setStreamingMessages((messages) =>
              messages.map((item) =>
                item.id === assistantMessageId
                  ? { ...item, status: 'completed' }
                  : item,
              ),
            )

            if (isMountedRef.current) {
              requestPreviewRefresh()
            }

            try {
              await queryClient.refetchQueries({
                queryKey: getAppConversationMessagesQueryKey(appId),
                type: 'active',
              })

              if (isMountedRef.current) {
                setStreamingMessages([])
              }
            } catch {
              message.warning('消息已生成，但刷新消息列表失败，请稍后手动刷新。')
            }

            return
          }

          latestFailedPromptRef.current = nextPrompt
          setStreamingMessages((messages) =>
            messages.map((item) =>
              item.id === assistantMessageId
                ? {
                  ...item,
                  status: 'failed',
                  content:
                    item.content ||
                    getAppChatStreamErrorMessage(error, 'AI 回复失败，请稍后重试。'),
                }
                : item,
            ),
          )
          message.error(getAppChatStreamErrorMessage(error, '消息发送失败，请稍后重试'))
        } finally {
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null
          }

          if (isMountedRef.current) {
            setIsStreaming(false)
            setGenerating(false)
            setSubmitting(false)
          }
        }
      })()

      return true
    },
    [
      accessToken,
      appId,
      handleLoginExpired,
      isStreaming,
      message,
      requestPreviewRefresh,
      setGenerating,
      setSubmitting,
    ],
  )

  const retryLastFailedMessage = useCallback(() => {
    const failedPrompt = latestFailedPromptRef.current

    if (!failedPrompt) {
      return false
    }

    return sendMessage(failedPrompt)
  }, [sendMessage])

  return {
    isStreaming,
    streamingMessages,
    sendMessage,
    retryLastFailedMessage,
  }
}
