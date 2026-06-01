import { useListAdminAppCases } from '@/api/generated/endpoints/admin-app-case'
import type { AppVO, PageResultAppVO } from '@/api/generated/models'
import emptyAppCover from '@/assets/empty-app-cover.svg'
import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Avatar, Button, Empty, Image, Input, Select, Table, Tooltip } from 'antd'
import type { TableProps } from 'antd'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import {
  APP_AUDIT_STATUS,
  APP_CASE_STATUS_FILTER,
  CASE_PAGE_SIZE,
  type AppCaseStatusFilter,
  buildAppCaseListRequest,
  canManageFeatured,
  formatCaseDateTime,
  formatCaseTotal,
  getCaseAuthorInitial,
  getCaseAuthorName,
  getCaseErrorMessage,
  getCaseTitle,
  hasPublicDeployAnomaly,
} from '../utils/caseManagement'
import { AppCaseStatusTag, FeaturedStatusTag } from './CaseStatusTag'

type FeaturedSelectValue = 'ALL' | 'true' | 'false'

export function AppCasesTable() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(CASE_PAGE_SIZE)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<AppCaseStatusFilter>(APP_CASE_STATUS_FILTER.ALL)
  const [featured, setFeatured] = useState<FeaturedSelectValue>('ALL')
  const featuredRequestValue = featured === 'ALL' ? 'ALL' : featured === 'true'
  const listRequest = buildAppCaseListRequest({
    pageNum: currentPage,
    pageSize,
    status,
    featured: featuredRequestValue,
    keyword,
  })
  const appsQuery = useListAdminAppCases<PageResultAppVO | undefined, { message?: string }>(
    { request: listRequest },
    {
      request: { params: listRequest },
      query: {
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const apps = appsQuery.data?.list ?? []
  const total = Number(appsQuery.data?.total ?? 0)

  const openDetail = (appId?: string) => {
    if (appId) {
      void navigate({ to: '/admin/app-cases/$appId', params: { appId } })
    }
  }

  const columns: TableProps<AppVO>['columns'] = [
    {
      title: '应用',
      dataIndex: 'name',
      width: 300,
      render: (_, record) => (
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={record.coverUrl || emptyAppCover}
            alt={`${getCaseTitle(record)}封面`}
            width={72}
            height={44}
            preview={false}
            className="rounded-lg object-cover object-top"
          />
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{getCaseTitle(record)}</div>
            <Tooltip title={record.id}>
              <div className="truncate font-mono text-xs text-slate-400">{record.id || '-'}</div>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: '作者',
      width: 180,
      render: (_, record) => (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            src={record.author?.avatar}
            className="shrink-0 bg-slate-100! text-xs! font-semibold!"
          >
            {getCaseAuthorInitial(record)}
          </Avatar>
          <span className="truncate text-slate-700">{getCaseAuthorName(record)}</span>
        </div>
      ),
    },
    {
      title: '案例状态',
      width: 120,
      render: (_, record) => <AppCaseStatusTag status={record.auditStatus} />,
    },
    {
      title: '精选',
      width: 110,
      render: (_, record) => (
        <FeaturedStatusTag
          featured={record.featured}
          disabled={!canManageFeatured(record)}
        />
      ),
    },
    {
      title: '部署地址',
      width: 180,
      render: (_, record) =>
        record.deployUrl ? (
          <a
            href={record.deployUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            <span className="truncate">打开应用</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : hasPublicDeployAnomaly(record) ? (
          <span className="text-amber-600">已公开但无部署地址</span>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      title: '部署时间',
      dataIndex: 'deployedAt',
      width: 180,
      render: formatCaseDateTime,
    },
    {
      title: '公开时间',
      dataIndex: 'publishedAt',
      width: 180,
      render: formatCaseDateTime,
    },
    {
      title: '精选时间',
      dataIndex: 'featuredAt',
      width: 180,
      render: formatCaseDateTime,
    },
    {
      title: '操作',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Button
          type={record.auditStatus === APP_AUDIT_STATUS.APPROVED ? 'primary' : 'link'}
          disabled={!record.id}
          onClick={() => openDetail(record.id)}
        >
          查看
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input.Search
            allowClear
            placeholder="搜索应用名称"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setCurrentPage(1)
            }}
            onSearch={() => setCurrentPage(1)}
            className="w-full sm:w-64"
          />
          <Select<AppCaseStatusFilter>
            value={status}
            options={[
              { label: '全部状态', value: APP_CASE_STATUS_FILTER.ALL },
              { label: '已公开', value: APP_CASE_STATUS_FILTER.APPROVED },
              { label: '已下架', value: APP_CASE_STATUS_FILTER.REJECTED },
            ]}
            onChange={(value) => {
              setStatus(value)
              setCurrentPage(1)
            }}
            className="w-full sm:w-36"
          />
          <Select<FeaturedSelectValue>
            value={featured}
            options={[
              { label: '全部精选', value: 'ALL' },
              { label: '已精选', value: 'true' },
              { label: '未精选', value: 'false' },
            ]}
            onChange={(value) => {
              setFeatured(value)
              setCurrentPage(1)
            }}
            className="w-full sm:w-36"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            icon={<RefreshCw className="size-4" />}
            loading={appsQuery.isFetching}
            onClick={() => void appsQuery.refetch()}
            className="rounded-lg"
          >
            刷新
          </Button>
          <span className="whitespace-nowrap text-sm text-slate-500">
            共 <span className="font-medium text-slate-900">{formatCaseTotal(total)}</span> 个案例
          </span>
        </div>
      </div>

      {appsQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title="应用案例列表加载失败"
          description={getCaseErrorMessage(appsQuery.error, '请稍后重试。')}
          action={
            <Button
              size="small"
              onClick={() => void appsQuery.refetch()}
            >
              重试
            </Button>
          }
          className="rounded-xl"
        />
      ) : (
        <Table<AppVO>
          rowKey={(record) => record.id ?? `${record.name ?? 'app'}-${record.createdAt ?? 'time'}`}
          size="medium"
          tableLayout="fixed"
          columns={columns}
          dataSource={apps}
          loading={appsQuery.isPending || appsQuery.isFetching}
          scroll={{ x: 1370 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无应用案例"
              />
            ),
          }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (itemTotal) => `共 ${formatCaseTotal(itemTotal)} 个案例`,
          }}
          onChange={(pagination) => {
            const nextPageSize = pagination.pageSize ?? pageSize
            setPageSize(nextPageSize)
            setCurrentPage(nextPageSize === pageSize ? (pagination.current ?? 1) : 1)
          }}
        />
      )}
    </div>
  )
}
