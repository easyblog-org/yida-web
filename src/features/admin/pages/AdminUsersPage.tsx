import { useListUsers } from '@/api/generated/endpoints/admin-user'
import type { ListUsersRequest, PageResultUserVO, UserVO } from '@/api/generated/models'
import { keepPreviousData } from '@tanstack/react-query'
import { Alert, Avatar, Button, Card, DatePicker, Empty, Input, Table, Tag, Tooltip } from 'antd'
import type { TableProps } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { RefreshCw, RotateCcw, Search, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'

const { RangePicker } = DatePicker

const PAGE_SIZE = 10
const DISPLAY_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const API_DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss'

type UserPickerRange = [Dayjs | null | undefined, Dayjs | null | undefined] | null
type UserTimeRange = readonly [Dayjs | null | undefined, Dayjs | null | undefined] | null
type UserSortOrder = 'ascend' | 'descend' | null

export const DEFAULT_USER_TABLE_SORT_ORDER: UserSortOrder = null

interface BuildUserListRequestOptions {
  pageNum: number
  pageSize: number
  account: string
  createTimeRange: UserTimeRange
  sortOrder: UserSortOrder
}

export function buildUserListRequest({
  pageNum,
  pageSize,
  account,
  createTimeRange,
  sortOrder,
}: BuildUserListRequestOptions): ListUsersRequest {
  const [createTimeStart, createTimeEnd] = createTimeRange ?? []
  const trimmedAccount = account.trim()
  const request: ListUsersRequest = {
    pageNum,
    pageSize,
    sortField: 'createTime',
    sortOrder: sortOrder === 'ascend' ? 'ASC' : 'DESC',
  }

  if (trimmedAccount) {
    request.account = trimmedAccount
  }

  // 仅在起止时间都存在时提交范围，避免后端收到半截筛选条件。
  if (createTimeStart && createTimeEnd) {
    request.createTimeStart = createTimeStart.format(API_DATE_TIME_FORMAT)
    request.createTimeEnd = createTimeEnd.format(API_DATE_TIME_FORMAT)
  }

  return request
}

export function formatUserDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  const parsedValue = dayjs(value)

  return parsedValue.isValid() ? parsedValue.format(DISPLAY_DATE_TIME_FORMAT) : value
}

export function getUserDisplayInitial(user: Pick<UserVO, 'nickname' | 'account' | 'id'>) {
  const source = user.nickname?.trim() || user.account?.trim() || user.id?.trim()

  return source?.slice(0, 1).toUpperCase() || '?'
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

function formatTotal(value?: string | number) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  return new Intl.NumberFormat('zh-CN').format(numericValue)
}

function renderMutedText(value?: string, fallback = '-') {
  const displayValue = value?.trim()

  return displayValue ? displayValue : <span className="text-slate-400">{fallback}</span>
}

function renderRoleTag(roleText?: string, role?: number) {
  const displayRole = roleText?.trim() || (role === 1 ? '管理员' : '普通用户')
  const isAdmin = role === 1 || displayRole.includes('管理员')

  return (
    <Tag
      color={isAdmin ? 'blue' : undefined}
      className="m-0"
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {isAdmin ? <ShieldCheck className="size-3" /> : <UserRound className="size-3" />}
        {displayRole}
      </span>
    </Tag>
  )
}

export function AdminUsersPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [accountInput, setAccountInput] = useState('')
  const [submittedAccount, setSubmittedAccount] = useState('')
  const [createTimeRangeInput, setCreateTimeRangeInput] = useState<UserPickerRange>(null)
  const [submittedCreateTimeRange, setSubmittedCreateTimeRange] = useState<UserPickerRange>(null)
  const [sortOrder, setSortOrder] = useState<UserSortOrder>(DEFAULT_USER_TABLE_SORT_ORDER)
  const listRequest = buildUserListRequest({
    pageNum: currentPage,
    pageSize,
    account: submittedAccount,
    createTimeRange: submittedCreateTimeRange,
    sortOrder,
  })
  const usersQuery = useListUsers<PageResultUserVO | undefined, { message?: string }>(
    { request: listRequest },
    {
      request: {
        params: listRequest,
      },
      query: {
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const pageResult = usersQuery.data
  const users = pageResult?.list ?? []
  const total = Number(pageResult?.total ?? 0)

  const submitFilters = (nextAccount = accountInput) => {
    setSubmittedAccount(nextAccount.trim())
    setSubmittedCreateTimeRange(createTimeRangeInput)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setAccountInput('')
    setSubmittedAccount('')
    setCreateTimeRangeInput(null)
    setSubmittedCreateTimeRange(null)
    setSortOrder(DEFAULT_USER_TABLE_SORT_ORDER)
    setCurrentPage(1)
  }

  const columns: TableProps<UserVO>['columns'] = [
    {
      title: '用户',
      dataIndex: 'nickname',
      width: 280,
      render: (_, record) => {
        const displayName = record.nickname?.trim() || '未设置昵称'
        const userId = record.id?.trim()

        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              src={record.avatar}
              alt={displayName}
              className="shrink-0 bg-slate-100! text-xs! font-semibold!"
            >
              {getUserDisplayInitial(record)}
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900">{displayName}</div>
              <Tooltip title={userId}>
                <div className="truncate font-mono text-xs text-slate-400">{userId || '-'}</div>
              </Tooltip>
            </div>
          </div>
        )
      },
    },
    {
      title: '账号',
      dataIndex: 'account',
      width: 180,
      render: (value?: string) => renderMutedText(value),
    },
    {
      title: '角色',
      dataIndex: 'roleText',
      width: 120,
      render: (value: string | undefined, record) => renderRoleTag(value, record.role),
    },
    {
      title: '简介',
      dataIndex: 'profile',
      width: 360,
      render: (value?: string) => {
        const displayProfile = value?.trim()

        if (!displayProfile) {
          return <span className="text-slate-400">暂无简介</span>
        }

        return (
          <Tooltip title={displayProfile}>
            <span className="block max-w-full truncate text-slate-600">{displayProfile}</span>
          </Tooltip>
        )
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createTime',
      width: 180,
      sorter: true,
      sortOrder,
      sortDirections: ['descend', 'ascend'],
      render: (value?: string) => formatUserDateTime(value),
    },
  ]

  const handleTableChange: TableProps<UserVO>['onChange'] = (pagination, _, sorter) => {
    const nextPageSize = pagination.pageSize ?? pageSize
    const nextSorter = Array.isArray(sorter) ? sorter[0] : sorter
    const nextSortOrder =
      nextSorter?.order === 'ascend' || nextSorter?.order === 'descend'
        ? nextSorter.order
        : DEFAULT_USER_TABLE_SORT_ORDER

    setPageSize(nextPageSize)
    setCurrentPage(nextPageSize === pageSize ? (pagination.current ?? 1) : 1)
    setSortOrder(nextSortOrder)
  }

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-slate-950">用户管理</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            查看当前系统中的用户信息
          </p>
        </div>
      </header>

      <Card
        title="用户列表"
        className="rounded-xl border-slate-200/70 bg-white shadow-sm"
        extra={
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <Input.Search
              allowClear
              value={accountInput}
              placeholder="搜索账号"
              enterButton="查询"
              prefix={<Search className="size-4 text-slate-400" />}
              loading={usersQuery.isFetching}
              onChange={(event) => setAccountInput(event.target.value)}
              onSearch={(value) => submitFilters(value)}
              className="w-full rounded-lg! xl:w-64"
            />
            <RangePicker
              showTime
              allowClear
              value={createTimeRangeInput}
              format={DISPLAY_DATE_TIME_FORMAT}
              onChange={setCreateTimeRangeInput}
              className="w-full rounded-lg! xl:w-96"
            />
            <div className="flex gap-2">
              <Button
                icon={<RotateCcw className="size-4" />}
                onClick={resetFilters}
                className="rounded-lg"
              >
                重置
              </Button>
              <Button
                icon={<RefreshCw className="size-4" />}
                loading={usersQuery.isFetching}
                onClick={() => void usersQuery.refetch()}
                className="rounded-lg"
              >
                刷新
              </Button>
            </div>
            <span className="whitespace-nowrap text-sm text-slate-500">
              共 <span className="font-medium text-slate-900">{formatTotal(total)}</span> 条
            </span>
          </div>
        }
      >
        {usersQuery.isError ? (
          <Alert
            showIcon
            type="error"
            title="用户列表加载失败"
            description={getErrorMessage(usersQuery.error, '请稍后重试。')}
            action={
              <Button
                size="small"
                onClick={() => void usersQuery.refetch()}
              >
                重试
              </Button>
            }
            className="rounded-xl"
          />
        ) : (
          <Table<UserVO>
            rowKey={(record) => record.id ?? record.account ?? record.nickname ?? 'unknown-user'}
            size="medium"
            tableLayout="fixed"
            columns={columns}
            dataSource={users}
            loading={usersQuery.isPending || usersQuery.isFetching}
            scroll={{ x: 1120 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无用户"
                />
              ),
            }}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (itemTotal) => `共 ${formatTotal(itemTotal)} 条`,
            }}
            onChange={handleTableChange}
          />
        )}
      </Card>
    </main>
  )
}
