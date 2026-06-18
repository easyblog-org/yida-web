import type { AppVO } from '@/api/generated/models'
import { Bubble } from '@ant-design/x'
import { Alert, Button, Empty, Spin } from 'antd'
import { Crosshair } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useAuthSessionStore } from '@/stores/auth-session'

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
    return <div className="whitespace-pre-wrap text-sm leading-6 text-[#0f1115]">{content}</div>
  }

  const lineText = parsedVisualEditPrompt.sourceLocation.lineNumber
    ? `:${parsedVisualEditPrompt.sourceLocation.lineNumber}`
    : ''

  return (
    <div className="space-y-3 text-sm leading-6 text-[#0f1115]">
      <div className="font-medium">请对以下选中元素进行修改：</div>
      <div className="whitespace-pre-wrap">
        <span className="font-medium">修改需求：</span>
        {parsedVisualEditPrompt.requirement || '未填写具体修改需求'}
      </div>
      <div className="flex min-w-0 items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-slate-500">
        <Crosshair
          className="size-4 shrink-0"
          aria-hidden="true"
        />
        <span className="shrink-0 font-mono text-sm font-semibold">
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

/** 移动端自定义消息项 */
function MobileMessageItem({
  message,
  contentNode,
  user,
}: {
  message: AppConversationDisplayMessage
  contentNode: React.ReactNode
  user?: { nickname?: string; avatar?: string } | null
}) {
  const isUser = getAppConversationBubbleRole(message.role) === 'user'
  const userDisplayName = user?.nickname?.trim() || '用户'
  const userAvatarUrl = user?.avatar

  if (isUser) {
    // 用户消息：头像+昵称在右上角，浅蓝灰背景（参考 DeepSeek）
    return (
      <div className="px-3 py-2.5 md:hidden">
        {/* 用户名 + 头像 行 */}
        <div className="mb-1.5 flex items-center justify-end gap-1.5">
          <span className="text-xs font-medium text-slate-500">{userDisplayName}</span>
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt={userDisplayName} className="size-7 shrink-0 rounded-full object-cover" />
          ) : (
            <AppConversationAvatar role="user" />
          )}
        </div>
        {/* 消息气泡 */}
        <div className="flex justify-end">
          <div className="max-w-[92%] rounded-2xl rounded-br-md bg-[#edf3fe] px-4 py-3 text-sm leading-6 text-[#0f1115]">
            {contentNode}
          </div>
        </div>
      </div>
    )
  }

  // AI 助手消息：Agent 标签 + 全宽内容区
  return (
    <div className="px-3 py-2.5 md:hidden">
      {/* Agent 标签行 */}
      <div className="mb-2 flex items-center gap-1.5">
        <AppConversationAvatar role="assistant" />
        <span className="text-sm font-medium text-slate-800">Agent</span>
      </div>
      {/* AI 回复内容 */}
      <div className="text-sm leading-6 text-slate-900">
        {contentNode}
      </div>
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
  const user = useAuthSessionStore((state) => state.user)
  const { isStreaming, streamingMessages, sendMessage, retryLastFailedMessage } = useAppChatStream(
    app.id,
  )
  const messagesQuery = useAppConversationMessages(app.id)
  const isSubmitEnabled = Boolean(app.id && messagesQuery.isSuccess)
  const isVisualEditEnabled = Boolean(app.id && isPreviewReady)
  const displayMessages: AppConversationDisplayMessage[] = [
    ...(messagesQuery.messages ?? []).map((message, index) => ({
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
      (messagesQuery.messages?.length ?? 0) > 0 ||
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
    messagesQuery.messages?.length,
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

        {/* 桌面端：保持原有 Ant Design Bubble.List */}
        <div className="hidden md:block">
          <Bubble.List
            autoScroll={false}
            classNames={appConversationBubbleListClassNames}
            items={conversationItems}
            role={appConversationBubbleRoles}
          />
        </div>

        {/* 移动端 */}
        <div className="md:hidden">
          {displayMessages.map((message, index) => (
            <MobileMessageItem
              key={message.id || `mobile-msg-${index}`}
              message={message}
              contentNode={conversationItems[index]?.content}
              user={user}
            />
          ))}
        </div>
      </>
    )
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 md:px-4 md:py-4 sm:px-3 sm:py-2"
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
