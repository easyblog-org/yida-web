import {
  invalidateListFollowers,
  invalidateListFollowing,
  useFollowUser,
  useListFollowers,
  useListFollowing,
  useUnfollowUser,
} from '@/api/generated/endpoints/user-follow'
import type {
  ListFollowUsersRequest,
  PageResultUserBriefVO,
  UserBriefVO,
} from '@/api/generated/models'
import { queryClient } from '@/libs/query-client'
import { keepPreviousData } from '@tanstack/react-query'
import { App, Avatar, Button, Empty, Input, Pagination, Skeleton, Tag } from 'antd'
import { Search, UserCheck, UserRoundPlus, UserRoundX } from 'lucide-react'
import { useState } from 'react'

import { getErrorMessage } from '../utils/profile'

const PAGE_SIZE = 10

type FollowUsersType = 'following' | 'followers'

export function ProfileFollowUsersSection({
  userId,
  type,
}: {
  userId?: string
  type: FollowUsersType
}) {
  const { message, modal } = App.useApp()
  const [keyword, setKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const search: ListFollowUsersRequest = {
    pageNum: currentPage,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
  }
  const queryParams = {
    request: search,
  }
  const followingQuery = useListFollowing<PageResultUserBriefVO | undefined, { message?: string }>(
    userId || '',
    queryParams,
    {
      request: {
        params: search,
      },
      query: {
        enabled: Boolean(userId && type === 'following'),
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const followersQuery = useListFollowers<PageResultUserBriefVO | undefined, { message?: string }>(
    userId || '',
    queryParams,
    {
      request: {
        params: search,
      },
      query: {
        enabled: Boolean(userId && type === 'followers'),
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const followMutation = useFollowUser<{ message?: string }>()
  const unfollowMutation = useUnfollowUser<{ message?: string }>()
  const activeQuery = type === 'following' ? followingQuery : followersQuery
  const pageResult = activeQuery.data
  const users = pageResult?.list ?? []
  const total = Number(pageResult?.total ?? 0)
  const title = type === 'following' ? '我的关注' : '我的粉丝'
  const description =
    type === 'following' ? '查看并管理你关注的用户。' : '查看关注你的用户，并按需回关。'

  const refreshCurrentList = async () => {
    if (!userId) {
      return
    }

    if (type === 'following') {
      await invalidateListFollowing(queryClient, userId, queryParams)
      return
    }

    await invalidateListFollowers(queryClient, userId, queryParams)
  }

  const handleFollow = async (targetUser: UserBriefVO) => {
    if (!targetUser.id) {
      return
    }

    try {
      await followMutation.mutateAsync({ userId: targetUser.id })
      await refreshCurrentList()
      message.success('已关注')
    } catch (error) {
      message.error(getErrorMessage(error, '关注失败'))
    }
  }

  const confirmUnfollow = (targetUser: UserBriefVO) => {
    if (!targetUser.id) {
      return
    }

    modal.confirm({
      centered: true,
      title: `取消关注「${targetUser.nickname || '该用户'}」？`,
      content: '取消后，你可以稍后再次关注。',
      okText: '取消关注',
      cancelText: '再想想',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          await unfollowMutation.mutateAsync({ userId: targetUser.id! })
          await refreshCurrentList()
          message.success('已取消关注')
        } catch (error) {
          message.error(getErrorMessage(error, '取消关注失败'))
          throw error
        }
      },
    })
  }

  const renderAction = (targetUser: UserBriefVO) => {
    if (targetUser.isFollowing) {
      return (
        <Button
          danger
          icon={<UserRoundX className="size-4" />}
          onClick={() => confirmUnfollow(targetUser)}
          className="rounded-full"
        >
          取消关注
        </Button>
      )
    }

    return (
      <Button
        type="primary"
        icon={<UserRoundPlus className="size-4" />}
        loading={followMutation.isPending}
        onClick={() => void handleFollow(targetUser)}
        className="rounded-full shadow-none"
      >
        关注
      </Button>
    )
  }

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-2xl font-bold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <Input
          allowClear
          prefix={<Search className="size-4 text-slate-400" />}
          placeholder="搜索用户"
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value.trim())
            setCurrentPage(1)
          }}
          className="h-10 w-full rounded-full sm:w-72"
        />
      </div>

      {!userId ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
          当前用户信息尚未加载，暂时无法查看列表。
        </div>
      ) : activeQuery.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(activeQuery.error, `${title}加载失败，请稍后重试`)}
        </div>
      ) : activeQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Skeleton
              key={index}
              active
              avatar
              paragraph={{ rows: 1 }}
              title={{ width: '25%' }}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
            />
          ))}
        </div>
      ) : users.length > 0 ? (
        <>
          <ul className="m-0 list-none space-y-3 p-0">
            {users.map((targetUser, index) => {
              const displayName = targetUser.nickname?.trim() || '未设置昵称'
              const displayInitial = displayName.slice(0, 1).toUpperCase()
              const targetUserKey = targetUser.id ?? `${targetUser.nickname ?? 'user'}-${index}`

              return (
                <li
                  key={targetUserKey}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar
                      size={44}
                      src={targetUser.avatar}
                      className="shrink-0 bg-slate-100!"
                    >
                      {displayInitial}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-base font-semibold text-slate-900">
                          {displayName}
                        </span>
                        {targetUser.isFollowing && targetUser.isFollowed ? (
                          <Tag
                            color="green"
                            className="m-0 shrink-0"
                            icon={<UserCheck className="size-3" />}
                          >
                            互相关注
                          </Tag>
                        ) : null}
                      </div>
                      <p className="m-0 mt-1 truncate text-sm text-slate-500">
                        {targetUser.profile || '暂无简介'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">{renderAction(targetUser)}</div>
                </li>
              )
            })}
          </ul>

          <div className="mt-6 flex justify-center">
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={total}
              showSizeChanger={false}
              onChange={setCurrentPage}
            />
          </div>
        </>
      ) : (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              keyword ? '没有匹配的用户' : `暂无${type === 'following' ? '关注' : '粉丝'}`
            }
          />
        </div>
      )}
    </section>
  )
}
