import { useGetApp } from '@/api/generated/endpoints/app'
import type { AppVO } from '@/api/generated/models'
import { useNavigate, useParams } from '@tanstack/react-router'
import { MessageSquare, MonitorPlay } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Layout, Result, Spin, Splitter, Tabs } from 'antd'

import { AppWorkbenchHeader } from '../components/AppWorkbenchHeader'
import { AppWorkspacePanel } from '../components/AppWorkspacePanel'
import { AppConversation } from '../components/AppConversation'
import { useWorkbenchRuntimeStore } from '../stores/useWorkbenchRuntimeStore'

const APP_FORBIDDEN_CODE = 40300
const APP_NOT_FOUND_CODE = 40400

export function AppWorkbenchPage() {
  const navigate = useNavigate()
  const { appId } = useParams({ from: '/workbench_/$appId' })
  const enterWorkbenchApp = useWorkbenchRuntimeStore((state) => state.enterApp)
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat')
  const appQuery = useGetApp<AppVO | undefined, { code?: number; message?: string }>(appId, {
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })
  // 业务错误码会被 Axios 拦截器 reject 到 query.error。
  const appErrorCode = appQuery.error?.code
  const appErrorMessage = appQuery.error?.message
  const appDetail = appQuery.data

  useEffect(() => {
    enterWorkbenchApp(appId)
  }, [appId, enterWorkbenchApp])

  const renderResultPage = (status: '403' | '404' | '500', title: string, subTitle: string) => (
    <main className="fixed inset-0 z-0 flex items-center justify-center bg-slate-50 px-4">
      <Result
        status={status}
        title={title}
        subTitle={subTitle}
        extra={
          <Button
            type="primary"
            onClick={() => void navigate({ to: '/' })}
          >
            返回首页
          </Button>
        }
      />
    </main>
  )

  if (appErrorCode === APP_FORBIDDEN_CODE) {
    return renderResultPage(
      '403',
      '无权访问应用',
      appErrorMessage || '你没有权限查看或编辑这个应用。',
    )
  }

  if (appErrorCode === APP_NOT_FOUND_CODE) {
    return renderResultPage(
      '404',
      '应用不存在',
      appErrorMessage || '该应用可能已被删除，或链接地址不正确。',
    )
  }

  if (appQuery.isError) {
    return renderResultPage('500', '应用加载失败', appErrorMessage || '请稍后重试。')
  }

  if (appQuery.isLoading) {
    return (
      <main className="fixed inset-0 z-0 flex items-center justify-center bg-slate-100 px-4">
        <div className="flex h-44 w-full max-w-sm flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <Spin />
          <p className="mt-4 text-sm font-medium text-slate-700">正在加载应用...</p>
        </div>
      </main>
    )
  }

  if (!appDetail) {
    return renderResultPage('404', '应用不存在', '没有找到对应的应用详情。')
  }

  return (
    <Layout className="fixed inset-0 z-0 flex overflow-hidden bg-slate-100 text-slate-950">
      <Layout.Header className="flex h-14! shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-slate-200 bg-white px-4! leading-normal! sm:px-5!">
        <AppWorkbenchHeader app={appDetail} />
      </Layout.Header>
      <Layout.Content className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {/* 桌面端：Splitter 双栏布局 */}
        <div className="hidden h-full md:block">
          <Splitter className="h-full min-h-0 flex-1 overflow-hidden bg-white">
            <Splitter.Panel
              defaultSize={520}
              min={320}
              max="48%"
            >
              <AppConversation app={appDetail} />
            </Splitter.Panel>
            <Splitter.Panel min={420}>
              <AppWorkspacePanel app={appDetail} />
            </Splitter.Panel>
          </Splitter>
        </div>

        {/* 移动端：Tab 切换布局 */}
        <div className="flex h-full min-h-0 flex-col md:hidden">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'chat' | 'preview')}
            className="flex! min-h-0! flex-col! [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav]:shrink-0 [&_.ant-tabs-nav]:px-3 [&_.ant-tabs-tab]:px-4! [&_.ant-tabs-tab]:py-2.5! [&_.ant-tabs-content-holder]:flex! [&_.ant-tabs-content-holder]:min-h-0! [&_.ant-tabs-content-holder]:flex-1! [&_.ant-tabs-content]:h-full! [&_.ant-tabs-tabpane]:h-full!"
            items={[
              {
                key: 'chat',
                label: (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <MessageSquare className="size-4" />
                    对话
                  </span>
                ),
                children: (
                  <div className="h-full overflow-hidden">
                    <AppConversation app={appDetail} />
                  </div>
                ),
              },
              {
                key: 'preview',
                label: (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <MonitorPlay className="size-4" />
                    预览
                  </span>
                ),
                children: (
                  <div className="h-full overflow-hidden">
                    <AppWorkspacePanel app={appDetail} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Layout.Content>
    </Layout>
  )
}
