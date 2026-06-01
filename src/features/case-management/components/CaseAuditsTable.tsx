import { useListAudits } from '@/api/generated/endpoints/admin-audit'
import type { AuditRecordVO, PageResultAuditRecordVO } from '@/api/generated/models'
import emptyAppCover from '@/assets/empty-app-cover.svg'
import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Avatar, Button, Empty, Image, Radio, Table, Tooltip } from 'antd'
import type { TableProps } from 'antd'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

import {
  CASE_PAGE_SIZE,
  type AuditStatusFilter,
  buildAuditListRequest,
  formatCaseDateTime,
  formatCaseTotal,
  getAuditRecordApp,
  getCaseAuthorInitial,
  getCaseAuthorName,
  getCaseErrorMessage,
  getCaseTitle,
  normalizeAuditRecordStatus,
} from '../utils/caseManagement'
import { AuditRecordStatusTag } from './CaseStatusTag'

const auditStatusOptions: Array<{ label: string; value: AuditStatusFilter }> = [
  { label: '全部', value: 'ALL' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已撤回', value: 'WITHDRAWN' },
]

export function CaseAuditsTable() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(CASE_PAGE_SIZE)
  const [status, setStatus] = useState<AuditStatusFilter>('ALL')
  const listRequest = buildAuditListRequest({ pageNum: currentPage, pageSize, status })
  const auditsQuery = useListAudits<PageResultAuditRecordVO | undefined, { message?: string }>(
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
  const audits = auditsQuery.data?.list ?? []
  const total = Number(auditsQuery.data?.total ?? 0)

  const openAuditDetail = (record: AuditRecordVO) => {
    if (!record.id) {
      return
    }

    void navigate({
      to: '/admin/case-audits/$recordId',
      params: { recordId: record.id },
    })
  }

  const columns: TableProps<AuditRecordVO>['columns'] = [
    {
      title: '案例',
      width: 300,
      render: (_, record) => {
        const app = getAuditRecordApp(record)

        return (
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src={app?.coverUrl || emptyAppCover}
              alt={`${getCaseTitle(app)}封面`}
              width={72}
              height={44}
              preview={false}
              className="rounded-lg object-cover object-top"
            />
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900">{getCaseTitle(app)}</div>
              <Tooltip title={record.appId ?? app?.id}>
                <div className="truncate font-mono text-xs text-slate-400">
                  {record.appId ?? app?.id ?? '-'}
                </div>
              </Tooltip>
            </div>
          </div>
        )
      },
    },
    {
      title: '作者',
      width: 180,
      render: (_, record) => {
        const app = getAuditRecordApp(record)

        return (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar
              src={app?.author?.avatar}
              className="shrink-0 bg-slate-100! text-xs! font-semibold!"
            >
              {getCaseAuthorInitial(app)}
            </Avatar>
            <span className="truncate text-slate-700">{getCaseAuthorName(app)}</span>
          </div>
        )
      },
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      width: 120,
      render: (value?: number) => <AuditRecordStatusTag status={value} />,
    },
    {
      title: '提审时间',
      dataIndex: 'createdAt',
      width: 180,
      render: formatCaseDateTime,
    },
    {
      title: '处理时间',
      dataIndex: 'auditTime',
      width: 180,
      render: formatCaseDateTime,
    },
    {
      title: '审核意见',
      dataIndex: 'remark',
      width: 260,
      render: (value?: string) => {
        const remark = value?.trim()

        if (!remark) {
          return <span className="text-slate-400">-</span>
        }

        return (
          <Tooltip title={remark}>
            <span className="block max-w-full truncate text-slate-600">{remark}</span>
          </Tooltip>
        )
      },
    },
    {
      title: '操作',
      fixed: 'right',
      width: 120,
      render: (_, record) => {
        const isPending = normalizeAuditRecordStatus(record.status) === 'PENDING'

        return (
          <Button
            type={isPending ? 'primary' : 'link'}
            disabled={!record.id}
            onClick={() => openAuditDetail(record)}
          >
            {isPending ? '审核' : '查看'}
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Radio.Group
          value={status}
          options={auditStatusOptions}
          optionType="button"
          buttonStyle="solid"
          onChange={(event) => {
            setStatus(event.target.value)
            setCurrentPage(1)
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            icon={<RefreshCw className="size-4" />}
            loading={auditsQuery.isFetching}
            onClick={() => void auditsQuery.refetch()}
            className="rounded-lg"
          >
            刷新
          </Button>
          <span className="whitespace-nowrap text-sm text-slate-500">
            共 <span className="font-medium text-slate-900">{formatCaseTotal(total)}</span> 条
          </span>
        </div>
      </div>

      {auditsQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title="审核记录加载失败"
          description={getCaseErrorMessage(auditsQuery.error, '请稍后重试。')}
          action={
            <Button
              size="small"
              onClick={() => void auditsQuery.refetch()}
            >
              重试
            </Button>
          }
          className="rounded-xl"
        />
      ) : (
        <Table<AuditRecordVO>
          rowKey={(record) => record.id ?? `${record.appId ?? 'app'}-${record.createdAt ?? 'time'}`}
          size="medium"
          tableLayout="fixed"
          columns={columns}
          dataSource={audits}
          loading={auditsQuery.isPending || auditsQuery.isFetching}
          scroll={{ x: 1340 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无审核记录"
              />
            ),
          }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (itemTotal) => `共 ${formatCaseTotal(itemTotal)} 条`,
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
