import {
  useCreateComment,
  useListRootComments,
  useReplyComment,
} from '@/api/generated/endpoints/comment'
import type { CommentVO, PageResultCommentVO } from '@/api/generated/models'
import { useAuthSessionStore } from '@/stores/auth-session'
import { App, Alert, Button, Empty, Input, Skeleton } from 'antd'
import { SendHorizonal } from 'lucide-react'
import { useEffect, useState } from 'react'

import { formatPublicCaseCount, getPublicCaseErrorMessage } from '../utils/publicCase'
import { PublicCaseCommentItem } from './PublicCaseCommentItem'
import { PublicCaseRepliesList } from './PublicCaseRepliesList'

const ROOT_COMMENTS_PAGE_SIZE = 10
const COMMENT_CONTENT_LIMIT = 500
const { TextArea } = Input

function getReplyRootId(comment: CommentVO) {
  return comment.rootId ?? comment.id
}

function formatCommentLength(value: string) {
  return `${value.length} / ${COMMENT_CONTENT_LIMIT}`
}

export function PublicCaseCommentsSection({ appId }: { appId: string }) {
  const { message } = App.useApp()
  const isAuthenticated = useAuthSessionStore((state) => Boolean(state.accessToken))
  const currentUserId = useAuthSessionStore((state) => state.user?.id)
  const [pageNum, setPageNum] = useState(1)
  const [rootComments, setRootComments] = useState<CommentVO[]>([])
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<CommentVO | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedRootIds, setExpandedRootIds] = useState<string[]>([])
  const [replyRefreshVersions, setReplyRefreshVersions] = useState<Record<string, number>>({})
  const commentsQuery = useListRootComments<PageResultCommentVO | undefined, { message?: string }>(
    appId,
    { request: { pageNum, pageSize: ROOT_COMMENTS_PAGE_SIZE } },
    {
      query: {
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const createCommentMutation = useCreateComment<{ message?: string }>()
  const replyCommentMutation = useReplyComment<{ message?: string }>()
  const totalComments = formatPublicCaseCount(commentsQuery.data?.total)

  useEffect(() => {
    const nextComments = commentsQuery.data?.list ?? []

    setRootComments((currentComments) => {
      if (pageNum === 1) {
        return nextComments
      }

      const existingIds = new Set(currentComments.map((comment) => comment.id))
      const appendedComments = nextComments.filter(
        (comment) => !comment.id || !existingIds.has(comment.id),
      )
      return [...currentComments, ...appendedComments]
    })
  }, [commentsQuery.data?.list, pageNum])

  const resetRootComments = async () => {
    setRootComments([])

    if (pageNum === 1) {
      await commentsQuery.refetch()
      return
    }

    setPageNum(1)
  }

  const requireLogin = () => {
    if (isAuthenticated) {
      return true
    }

    message.warning('请先登录后评论')
    return false
  }

  const handleCreateComment = async () => {
    if (!requireLogin()) {
      return
    }

    const trimmedContent = content.trim()
    if (!trimmedContent) {
      message.warning('请输入评论内容')
      return
    }

    try {
      await createCommentMutation.mutateAsync({ appId, data: { content: trimmedContent } })
      message.success('评论已发布')
      setContent('')
      await resetRootComments()
    } catch (error) {
      message.error(getPublicCaseErrorMessage(error, '评论发布失败'))
    }
  }

  const handleReply = async () => {
    if (!replyingTo || !replyingTo.id || !requireLogin()) {
      return
    }

    const trimmedReply = replyContent.trim()
    if (!trimmedReply) {
      message.warning('请输入回复内容')
      return
    }

    const rootId = getReplyRootId(replyingTo)
    try {
      await replyCommentMutation.mutateAsync({
        commentId: replyingTo.id,
        data: { content: trimmedReply },
      })
      message.success('回复已发布')
      setReplyingTo(null)
      setReplyContent('')

      if (rootId) {
        setExpandedRootIds((currentIds) =>
          currentIds.includes(rootId) ? currentIds : [...currentIds, rootId],
        )
        setReplyRefreshVersions((versions) => ({
          ...versions,
          [rootId]: (versions[rootId] ?? 0) + 1,
        }))
      }

      await resetRootComments()
    } catch (error) {
      message.error(getPublicCaseErrorMessage(error, '回复发布失败'))
    }
  }

  const renderReplyEditor = (rootId?: string) => {
    if (!replyingTo || getReplyRootId(replyingTo) !== rootId) {
      return null
    }

    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 max-md:rounded-none">
        <div className="mb-2 text-xs text-slate-500">
          回复 {replyingTo.author?.nickname ?? '该用户'}
        </div>
        <TextArea
          value={replyContent}
          maxLength={COMMENT_CONTENT_LIMIT}
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder="写下你的回复"
          onChange={(event) => setReplyContent(event.target.value)}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{formatCommentLength(replyContent)}</span>
          <div className="flex gap-2">
            <Button
              size="small"
              className="rounded-full!"
              onClick={() => {
                setReplyingTo(null)
                setReplyContent('')
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<SendHorizonal className="size-4" />}
              loading={replyCommentMutation.isPending}
              onClick={() => void handleReply()}
              className="rounded-full!"
            >
              回复
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderCommentsContent = () => {
    if (commentsQuery.isError) {
      return (
        <Alert
          showIcon
          type="error"
          message="评论加载失败"
          description={getPublicCaseErrorMessage(commentsQuery.error, '请稍后重试')}
          action={
            <Button
              className="rounded-full!"
              onClick={() => void commentsQuery.refetch()}
            >
              重试
            </Button>
          }
          className="rounded-lg max-md:rounded-none"
        />
      )
    }

    if (commentsQuery.isLoading && rootComments.length === 0) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              active
              avatar
              paragraph={{ rows: 2 }}
            />
          ))}
        </div>
      )
    }

    if (rootComments.length === 0) {
      return (
        <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-slate-100 bg-slate-50/60 max-md:rounded-none">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无评论"
          />
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {rootComments.map((comment, index) => {
          const rootId = comment.id
          const replyCount = formatPublicCaseCount(comment.replyCount)
          const isExpanded = Boolean(rootId && expandedRootIds.includes(rootId))

          return (
            <div
              key={comment.id ?? `${appId}-comment-${index}`}
              className="border-b border-slate-100 pb-5 last:border-b-0 last:pb-0"
            >
              <PublicCaseCommentItem
                comment={comment}
                currentUserId={currentUserId}
                onReply={setReplyingTo}
                onDeleted={() => void resetRootComments()}
              />

              {renderReplyEditor(rootId)}

              {rootId && replyCount > 0 && !isExpanded ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setExpandedRootIds((currentIds) => [...currentIds, rootId])}
                  className="mt-2 rounded-full! px-0"
                >
                  查看 {replyCount} 条回复
                </Button>
              ) : null}

              {rootId && isExpanded ? (
                <PublicCaseRepliesList
                  rootCommentId={rootId}
                  currentUserId={currentUserId}
                  refreshVersion={replyRefreshVersions[rootId] ?? 0}
                  onReply={setReplyingTo}
                  onReplyChanged={() => void resetRootComments()}
                />
              ) : null}
            </div>
          )
        })}

        {commentsQuery.data?.hasNext ? (
          <Button
            block
            loading={commentsQuery.isFetching && pageNum > 1}
            onClick={() => setPageNum((value) => value + 1)}
            className="rounded-full!"
          >
            加载更多评论
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <h2 className="m-0 text-base font-bold text-slate-950">评论</h2>
        <span className="text-xs text-slate-500">{totalComments} 条</span>
      </div>

      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <TextArea
          value={content}
          maxLength={COMMENT_CONTENT_LIMIT}
          autoSize={{ minRows: 3, maxRows: 5 }}
          placeholder="写下你的评论"
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{formatCommentLength(content)}</span>
          <Button
            type="primary"
            icon={<SendHorizonal className="size-4" />}
            loading={createCommentMutation.isPending}
            onClick={() => void handleCreateComment()}
            className="rounded-full!"
          >
            发布
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">{renderCommentsContent()}</div>
    </section>
  )
}
