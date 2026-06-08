import { useGetCase } from '@/api/generated/endpoints/case'
import type { AppVO } from '@/api/generated/models'
import { useParams } from '@tanstack/react-router'
import { Button, Result, Spin } from 'antd'

import { PublicCaseCommentsSection } from '../components/PublicCaseCommentsSection'
import { PublicCaseInfoPanel } from '../components/PublicCaseInfoPanel'
import { PublicCasePreviewFrame } from '../components/PublicCasePreviewFrame'
import { getPublicCaseErrorMessage } from '../utils/publicCase'

export function PublicCaseDetailPage() {
  const { appId } = useParams({ from: '/_case-detail/cases/$appId' })
  const caseQuery = useGetCase<AppVO | undefined, { message?: string }>(appId, {
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })

  if (caseQuery.isLoading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <Spin />
      </main>
    )
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <main className="flex h-screen items-center justify-center bg-slate-100 p-6">
        <Result
          status={caseQuery.isError ? '500' : '404'}
          title={caseQuery.isError ? '应用案例详情加载失败' : '应用案例不存在'}
          subTitle={getPublicCaseErrorMessage(caseQuery.error, '请稍后重试')}
          extra={
            <Button
              className="rounded-full!"
              onClick={() => void caseQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      </main>
    )
  }

  const app = caseQuery.data

  return (
    <main className="grid h-screen w-full grid-cols-[minmax(0,1fr)_400px] gap-3 overflow-hidden p-3 max-md:grid-cols-1 max-md:h-auto max-md:overflow-visible max-md:p-0">
      <div className="flex w-full max-md:h-[100dvh]">
        <PublicCasePreviewFrame deployUrl={app.deployUrl} />
      </div>
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        <PublicCaseInfoPanel app={app} />
        <PublicCaseCommentsSection appId={appId} />
      </aside>
    </main>
  )
}
