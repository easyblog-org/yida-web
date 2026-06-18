import type { AppChatMessageVO, CursorResultAppChatMessageVO } from '@/api/generated/models'

export type AppConversationBubbleRole = 'assistant' | 'user'

export type AppConversationMessageStatus = 'generating' | 'failed' | 'completed'

export type AppConversationDisplayMessage = AppChatMessageVO & {
  id: string
  isLocal?: boolean
  status?: AppConversationMessageStatus
}

export function getAppConversationBubbleRole(role?: string): AppConversationBubbleRole {
  return role?.toLowerCase() === 'user' ? 'user' : 'assistant'
}

export function createLocalAppConversationMessage({
  id,
  role,
  content = '',
  status = 'completed',
}: {
  id: string
  role: AppConversationBubbleRole
  content?: string
  status?: AppConversationMessageStatus
}): AppConversationDisplayMessage {
  return {
    id,
    role,
    content,
    status,
    isLocal: true,
    createdAt: new Date().toISOString(),
  }
}

export function isAppChatStreamErrorContent(content: string) {
  const trimmed = content.trim()

  if (!trimmed.startsWith('【错误】')) {
    return false
  }

  // 仅当去除错误前缀后剩余内容很短时才判定为纯错误。
  // 后端可能返回以【错误】开头的长文本（含有用信息），不应整体判为失败。
  const bodyAfterErrorPrefix = trimmed.slice(4).trim()

  return bodyAfterErrorPrefix.length < 50
}

export function shouldStreamAppConversationMarkdown(
  message: Pick<AppConversationDisplayMessage, 'role' | 'status'>,
) {
  return (
    getAppConversationBubbleRole(message.role) === 'assistant' && message.status === 'generating'
  )
}

export function getNextAppConversationCursor(page: CursorResultAppChatMessageVO): string | null {
  const nextCursor = page.nextCursor?.trim()

  if (!page.hasMore || !nextCursor) {
    return null
  }

  return nextCursor
}

export function flattenAppConversationMessagePages(
  pages?: CursorResultAppChatMessageVO[],
): AppChatMessageVO[] {
  if (!pages?.length) {
    return []
  }

  // 后端首屏返回最新一页，继续翻页返回更早记录；展示时需要把更早页排在前面。
  return [...pages].reverse().flatMap((page) => page.list ?? [])
}
