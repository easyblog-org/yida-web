import { Button, Dropdown, Empty } from 'antd'
import type { MenuProps } from 'antd'
import { Home, MoreHorizontal, RefreshCw } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export function PublicCasePreviewFrame({ deployUrl }: { deployUrl?: string }) {
  const [frameKey, setFrameKey] = useState(0)
  const [hasFrameError, setHasFrameError] = useState(false)
  const navigate = useNavigate()
  const hasDeployUrl = Boolean(deployUrl?.trim())

  const refreshFrame = () => {
    setHasFrameError(false)
    setFrameKey((value) => value + 1)
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'refresh',
      icon: <RefreshCw className="size-4" />,
      label: '刷新预览',
      onClick: refreshFrame,
    },
    {
      key: 'home',
      icon: <Home className="size-4" />,
      label: '返回主页',
      onClick: () => void navigate({ to: '/' }),
    },
  ]

  return (
    <section className="flex w-full min-w-0 min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white max-md:rounded-none max-md:border-0">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
        <span className="text-sm font-medium text-slate-700">应用预览</span>
        {hasDeployUrl ? (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-200/60 active:bg-slate-200 max-md:size-9"
            >
              <MoreHorizontal className="size-[18px] max-md:size-5" />
            </button>
          </Dropdown>
        ) : null}
      </div>

      {!hasDeployUrl ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50/60 p-6">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="应用暂不可预览"
          />
        </div>
      ) : hasFrameError ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-slate-50/60 p-6">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="应用预览加载失败"
          />
          <Button
            className="rounded-full!"
            onClick={refreshFrame}
          >
            重试
          </Button>
        </div>
      ) : (
        <iframe
          key={frameKey}
          title="应用预览"
          src={deployUrl}
          onError={() => setHasFrameError(true)}
          className="min-h-0 w-full flex-1 border-0 bg-white"
          sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
        />
      )}
    </section>
  )
}
