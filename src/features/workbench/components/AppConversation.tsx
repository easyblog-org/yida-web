import type { AppVO } from '@/api/generated/models'
import { Bubble } from '@ant-design/x'
import { Alert, Button, Empty, Spin } from 'antd'
import { Crosshair } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useAppChatStream } from '../hooks/useAppChatStream'
import { useAppConversationMessages } from '../hooks/useAppConversationMessages'
import { useWorkbenchRuntimeStore } from '../stores/useWorkbenchRuntimeStore'
import {
  getAppConversationBubbleRole,
  type AppConversationDisplayMessage,
} from '../utils/appConversationMessages'
import { isAppConversationNearBottom } from '../utils/appConversationScroll'
import { parseVisualEditPrompt } from '../utils/visualEdit'
import { AppAssistantMessageContent } from './AppAssistantMessageContent'
import { AppConversationAvatar } from './AppConversationAvatar'
import { AppConversationComposer } from './AppConversationComposer'

const appConversationBubbleRoles = {
  assistant: {
    placement: 'start' as const,
    avatar: <AppConversationAvatar role="assistant" />,
  },
  user: {
    placement: 'end' as const,
    avatar: <AppConversationAvatar role="user" />,
  },
}

const appConversationBubbleListClassNames = {
  root: '!max-h-none',
  scroll: '!max-h-none !overflow-visible',
}

function getAppConversationErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return '消息列表加载失败，请稍后重试。'
}

function renderUserMessageContent(content: string) {
  const parsedVisualEditPrompt = parseVisualEditPrompt(content)

  if (!parsedVisualEditPrompt) {
    return <div className="whitespace-pre-wrap text-sm leading-6">{content}</div>
  }

  const lineText = parsedVisualEditPrompt.sourceLocation.lineNumber
    ? `:${parsedVisualEditPrompt.sourceLocation.lineNumber}`
    : ''

  return (
    <div className="space-y-3 text-sm leading-6">
      <div className="font-medium text-slate-900">请对以下选中元素进行修改：</div>
      <div className="whitespace-pre-wrap text-slate-900">
        <span className="font-medium">修改需求：</span>
        {parsedVisualEditPrompt.requirement || '未填写具体修改需求'}
      </div>
      <div className="flex min-w-0 items-center gap-2 rounded-md bg-white/75 px-3 py-2 text-slate-500">
        <Crosshair
          className="size-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <span className="shrink-0 font-mono text-sm font-semibold text-slate-700">
          {`<${parsedVisualEditPrompt.element.tag}>`}
        </span>
        <span className="min-w-0 truncate font-mono text-sm">
          {parsedVisualEditPrompt.sourceLocation.filePath}
          {lineText}
        </span>
      </div>
    </div>
  )
}

function renderAppConversationMessageContent({
  message,
  onRetry,
}: {
  message: AppConversationDisplayMessage
  onRetry?: () => void
}) {
  const role = getAppConversationBubbleRole(message.role)
  const content = message.content ?? ''
  const hasContent = Boolean(content.trim())
  const isGenerating = message.status === 'generating'
  const isFailed = message.status === 'failed'
  const mainContent = hasContent ? content : isGenerating ? '正在生成回复...' : '（空消息）'
  const contentNode =
    role === 'assistant' && isGenerating && !hasContent ? (
      <div className="flex items-center gap-2 text-sm leading-6 text-slate-500">
        <Spin size="small" />
        <span>{mainContent}</span>
      </div>
    ) : role === 'assistant' ? (
      <AppAssistantMessageContent
        content={mainContent}
        isGenerating={isGenerating}
      />
    ) : (
      renderUserMessageContent(mainContent)
    )
  const statusNode = isFailed ? (
    <Alert
      type="error"
      showIcon
      className="mt-2"
      title="本轮生成失败"
      action={
        onRetry ? (
          <Button
            size="small"
            onClick={onRetry}
          >
            重试
          </Button>
        ) : undefined
      }
    />
  ) : null

  return (
    <div>
      {contentNode}
      {statusNode}
    </div>
  )
}

export function AppConversation({ app }: { app: AppVO }) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const shouldStickToBottomRef = useRef(true)
  const autoInitialChatAppIdsRef = useRef(new Set<string>())
  const isSubmitting = useWorkbenchRuntimeStore((state) => state.isSubmitting)
  const isPreviewReady = useWorkbenchRuntimeStore((state) => state.isPreviewReady)
  const isVisualEditMode = useWorkbenchRuntimeStore((state) => state.isVisualEditMode)
  const selectedVisualEditElement = useWorkbenchRuntimeStore(
    (state) => state.selectedVisualEditElement,
  )
  const setVisualEditMode = useWorkbenchRuntimeStore((state) => state.setVisualEditMode)
  const { isStreaming, streamingMessages, sendMessage, retryLastFailedMessage } = useAppChatStream(
    app.id,
  )
  const messagesQuery = useAppConversationMessages(app.id)
  const isSubmitEnabled = Boolean(app.id && messagesQuery.isSuccess)
  const isVisualEditEnabled = Boolean(app.id && isPreviewReady)
  const displayMessages: AppConversationDisplayMessage[] = [
    ...messagesQuery.messages.map((message, index) => ({
      ...message,
      id: message.id ?? `message-${index}`,
      status: 'completed' as const,
    })),
    ...streamingMessages,
  ]
  const conversationItems = displayMessages.map((message, index) => ({
    key: message.id || `message-${index}`,
    role: getAppConversationBubbleRole(message.role),
    content: renderAppConversationMessageContent({
      message,
      onRetry: message.status === 'failed' ? retryLastFailedMessage : undefined,
    }),
  }))
  const streamingContent = streamingMessages.map((message) => message.content ?? '').join('')

  useEffect(() => {
    const scrollElement = scrollContainerRef.current

    if (!scrollElement || !conversationItems.length || !shouldStickToBottomRef.current) {
      return
    }

    // 流式 Markdown 会持续改变内容高度，等本轮渲染完成后再贴到底部。
    const frameId = window.requestAnimationFrame(() => {
      scrollElement.scrollTop = scrollElement.scrollHeight
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [conversationItems.length, isStreaming, streamingContent])

  useEffect(() => {
    const appId = app.id?.trim()
    const initialPrompt = app.initPrompt?.trim()

    if (
      !appId ||
      !initialPrompt ||
      !messagesQuery.isSuccess ||
      messagesQuery.messages.length > 0 ||
      isStreaming ||
      autoInitialChatAppIdsRef.current.has(appId)
    ) {
      return
    }

    // 自动首轮只负责触发普通发送链路；防重记录避免空消息 refetch 后重复请求。
    autoInitialChatAppIdsRef.current.add(appId)

    shouldStickToBottomRef.current = true

    if (!sendMessage(initialPrompt)) {
      autoInitialChatAppIdsRef.current.delete(appId)
    }
  }, [
    app.id,
    app.initPrompt,
    isStreaming,
    messagesQuery.isSuccess,
    messagesQuery.messages.length,
    sendMessage,
  ])

  const handleSubmitMessage = (prompt: string) => {
    const isSent = sendMessage(prompt)

    if (isSent) {
      shouldStickToBottomRef.current = true
    }

    return isSent
  }

  const handleConversationScroll = () => {
    const scrollElement = scrollContainerRef.current

    if (!scrollElement) {
      return
    }

    shouldStickToBottomRef.current = isAppConversationNearBottom(scrollElement)
  }

  const handleFetchNextPage = () => {
    shouldStickToBottomRef.current = false
    void messagesQuery.fetchNextPage()
  }

  const renderConversationBody = () => {
    if (messagesQuery.isLoading) {
      return (
        <div className="flex h-full min-h-48 items-center justify-center">
          <Spin />
        </div>
      )
    }

    if (messagesQuery.isError && !conversationItems.length) {
      return (
        <Alert
          type="error"
          showIcon
          title={getAppConversationErrorMessage(messagesQuery.error)}
          action={
            <Button
              size="small"
              onClick={() => void messagesQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      )
    }

    if (isStreaming && !conversationItems.length) {
      return (
        <div className="flex h-full min-h-48 items-center justify-center">
          <Spin />
        </div>
      )
    }

    if (!conversationItems.length) {
      return (
        <div className="flex h-full min-h-48 items-center justify-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无对话消息"
          />
        </div>
      )
    }

    return (
      <>
        {messagesQuery.isError && (
          <Alert
            type="error"
            showIcon
            className="mb-3"
            title={getAppConversationErrorMessage(messagesQuery.error)}
          />
        )}
        {messagesQuery.hasNextPage && (
          <div className="mb-4 flex justify-center">
            <Button
              size="small"
              loading={messagesQuery.isFetchingNextPage}
              disabled={messagesQuery.isFetchingNextPage}
              onClick={handleFetchNextPage}
            >
              加载更早消息
            </Button>
          </div>
        )}
        <Bubble.List
          autoScroll={false}
          classNames={appConversationBubbleListClassNames}
          items={conversationItems}
          role={appConversationBubbleRoles}
        />
      </>
    )
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4"
        onScroll={handleConversationScroll}
      >
        {renderConversationBody()}
      </div>

      <AppConversationComposer
        isSubmitEnabled={isSubmitEnabled}
        isSubmitting={isSubmitting || isStreaming}
        isVisualEditEnabled={isVisualEditEnabled}
        isVisualEditMode={isVisualEditMode}
        selectedVisualEditElement={selectedVisualEditElement}
        onVisualEditModeChange={setVisualEditMode}
        onSubmitMessage={handleSubmitMessage}
      />
    </section>
  )
}
