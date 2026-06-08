import { useListCases } from '@/api/generated/endpoints/case'
import type { ListCasesRequest, PageResultAppVO } from '@/api/generated/models'
import { keepPreviousData } from '@tanstack/react-query'
import { Alert, Button, Empty, Input, Pagination, Select, Spin } from 'antd'
import { Compass, Search } from 'lucide-react'
import { useState } from 'react'

import { PublicCaseCard } from '../components/PublicCaseCard'
import {
  getPublicCaseErrorMessage,
  mapAppToPublicCaseCardData,
  openPublicCaseDetailInNewTab,
} from '../utils/publicCase'

const PAGE_SIZE = 9
const CASE_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '精选', value: 'featured' },
]

type CaseFilterValue = 'all' | 'featured'

export function CasesSquarePage() {
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<CaseFilterValue>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const search: ListCasesRequest = {
    pageNum: currentPage,
    pageSize: PAGE_SIZE,
    keyword: keyword.trim() || undefined,
    featuredOnly: filter === 'featured' ? true : undefined,
  }
  const queryParams = { request: search }
  const casesQuery = useListCases<PageResultAppVO | undefined, { message?: string }>(queryParams, {
    query: {
      placeholderData: keepPreviousData,
      retry: false,
      select: (response) => response.data,
    },
  })
  const cases = casesQuery.data?.list ?? []
  const total = Number(casesQuery.data?.total ?? 0)

  return (
    <main className="space-y-6 mt-4 max-md:mt-0">
      {/* <header>
        <h1 className="m-0 flex items-center gap-3 text-3xl font-semibold text-slate-950">
          <span className="flex size-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Compass className="size-5" />
          </span>
          案例广场
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          浏览优秀应用案例，发现可复用的搭建思路。
        </p>
      </header> */}

      {/* ── 搜索 & 筛选栏 ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Input
            allowClear
            size="large"
            prefix={<Search className="size-[18px] text-slate-400" />}
            placeholder="搜索案例名称或关键词..."
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setCurrentPage(1)
            }}
            className="min-w-0 flex-1 rounded-xl! px-4! max-md:h-11! sm:h-12 sm:px-5! shadow-sm shadow-slate-900/5 max-md:[&_.ant-input]:pb-[13px]"
          />
          <Select
            size="large"
            value={filter}
            options={CASE_FILTER_OPTIONS}
            onChange={(value: CaseFilterValue) => {
              setFilter(value)
              setCurrentPage(1)
            }}
            className="shrink-0 rounded-xl! [--ant-select-border-radius:12px] max-md:w-[88px]! max-md:[--ant-select-height:44px] max-md:[--ant-select-padding-horizontal:12px] sm:w-28 sm:[--ant-select-border-radius:9999px] sm:[--ant-select-height:48px] sm:[--ant-select-padding-horizontal:20px]"
          />
        </div>
      </section>

      {casesQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title="案例加载失败"
          description={getPublicCaseErrorMessage(casesQuery.error, '请稍后重试')}
          action={<Button onClick={() => void casesQuery.refetch()}>重试</Button>}
          className="rounded-xl"
        />
      ) : casesQuery.isLoading ? (
        <div className="flex min-h-56 items-center justify-center">
          <Spin size="large" />
        </div>
      ) : cases.length > 0 ? (
        <>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cases.map((app, index) => {
              const appCase = mapAppToPublicCaseCardData(app)

              return (
                <PublicCaseCard
                  key={app.id ?? `${app.name ?? 'case'}-${index}`}
                  appCase={appCase}
                  onOpen={(currentCase) => openPublicCaseDetailInNewTab(currentCase.id)}
                />
              )
            })}
          </section>

          <footer className="flex justify-center pt-2">
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={total}
              showSizeChanger={false}
              onChange={setCurrentPage}
            />
          </footer>
        </>
      ) : (
        <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无案例"
          />
        </div>
      )}
    </main>
  )
}
