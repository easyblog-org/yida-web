import zhidaLogo from '@/assets/zhida-logo.svg'
import {
  downloadAppSourceCode,
  invalidateGetApp,
  useDeployApp,
  useSubmitAppAudit,
  useWithdrawAppAudit,
} from '@/api/generated/endpoints/app'
import type { AppVO } from '@/api/generated/models'
import { useAuthSessionStore } from '@/stores/auth-session'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { App, Button, Dropdown, Popover } from 'antd'
import { Download, ExternalLink, MoreHorizontal, Rocket, SendHorizontal, Undo2 } from 'lucide-react'
import type { MenuProps } from 'antd'

const APP_AUDIT_STATUS = {
  DRAFT: 0,
  PENDING: 1,
  REJECTED: 3,
} as const

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export function AppWorkbenchHeader({ app }: { app?: AppVO }) {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const currentUser = useAuthSessionStore((state) => state.user)
  const [isDownloading, setIsDownloading] = useState(false)

  const appId = app?.id
  const isDeployed = Boolean(app?.deployKey?.trim())
  const isAuthor = Boolean(currentUser?.id && app?.author?.id && currentUser.id === app.author.id)
  const isAuditPending = app?.auditStatus === APP_AUDIT_STATUS.PENDING
  const canSubmitAudit = Boolean(
    appId &&
    isAuthor &&
    app?.deployedAt &&
    app?.deployKey?.trim() &&
    (app.auditStatus === APP_AUDIT_STATUS.DRAFT || app.auditStatus === APP_AUDIT_STATUS.REJECTED),
  )
  const canWithdrawAudit = Boolean(appId && isAuthor && isAuditPending)
  const deployedAtText = app?.deployedAt ? app.deployedAt.replace('T', ' ').slice(0, 19) : '-'

  const deployMutation = useDeployApp<{ message?: string }>({
    mutation: {
      onSuccess: async (_response, variables) => {
        message.success('部署成功')
        await invalidateGetApp(queryClient, variables.appId)
      },
      onError: (error) => {
        message.error(getErrorMessage(error, '部署失败，请稍后重试'))
      },
    },
  })

  const submitAuditMutation = useSubmitAppAudit<{ message?: string }>({
    mutation: {
      onSuccess: async (_response, variables) => {
        message.success('已提交审核')
        await invalidateGetApp(queryClient, variables.appId)
      },
      onError: (error) => {
        message.error(getErrorMessage(error, '提交审核失败，请稍后重试'))
      },
    },
  })

  const withdrawAuditMutation = useWithdrawAppAudit<{ message?: string }>({
    mutation: {
      onSuccess: async (_response, variables) => {
        message.success('已撤回审核')
        await invalidateGetApp(queryClient, variables.appId)
      },
      onError: (error) => {
        message.error(getErrorMessage(error, '撤回审核失败，请稍后重试'))
      },
    },
  })

  const handleDownloadSourceCode = async () => {
    if (!appId) {
      return
    }

    setIsDownloading(true)

    try {
      const blob = (await downloadAppSourceCode(appId, {
        responseType: 'blob',
      })) as unknown as Blob
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const appName = app?.name?.trim() || '应用源码'

      // 后端返回 zip 二进制文件，这里用临时链接交给浏览器下载。
      link.href = downloadUrl
      link.download = `${appName.replace(/[\\/:*?"<>|]/g, '_')}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)
      message.success('源码下载已开始')
    } catch (error) {
      message.error(getErrorMessage(error, '源码下载失败，请稍后重试'))
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDeploy = () => {
    if (!appId) {
      return
    }

    if (!isDeployed) {
      deployMutation.mutate({ appId })
      return
    }

    modal.confirm({
      title: '重新部署应用？',
      content: '重新部署会更新当前应用的线上访问版本。',
      okText: '重新部署',
      cancelText: '取消',
      onOk: () => deployMutation.mutateAsync({ appId }),
    })
  }

  const handleSubmitAudit = () => {
    if (!appId || !canSubmitAudit) {
      return
    }

    modal.confirm({
      title: '提交审核应用？',
      content: '提交后应用将进入审核流程，审核通过后可公开展示。',
      okText: '提交审核',
      cancelText: '取消',
      onOk: () => submitAuditMutation.mutateAsync({ appId }),
    })
  }

  const handleWithdrawAudit = () => {
    if (!appId || !canWithdrawAudit) {
      return
    }

    modal.confirm({
      title: '撤回审核应用？',
      content: '撤回后应用会回到草稿状态，需要重新提交审核。',
      okText: '撤回审核',
      cancelText: '取消',
      onOk: () => withdrawAuditMutation.mutateAsync({ appId }),
    })
  }

  const handleMoreMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'download') {
      void handleDownloadSourceCode()
      return
    }

    if (key === 'submit-audit') {
      handleSubmitAudit()
      return
    }

    if (key === 'withdraw-audit') {
      handleWithdrawAudit()
    }
  }

  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'download',
      disabled: !appId || isDownloading,
      icon: (
        <Download
          className="size-4"
          aria-hidden="true"
        />
      ),
      label: isDownloading ? '正在下载' : '下载源码',
    },
    isAuditPending
      ? {
          key: 'withdraw-audit',
          disabled: !canWithdrawAudit || withdrawAuditMutation.isPending,
          icon: (
            <Undo2
              className="size-4"
              aria-hidden="true"
            />
          ),
          label: withdrawAuditMutation.isPending ? '正在撤回' : '撤回审核',
        }
      : {
          key: 'submit-audit',
          disabled: !canSubmitAudit || submitAuditMutation.isPending,
          icon: (
            <SendHorizontal
              className="size-4"
              aria-hidden="true"
            />
          ),
          label: submitAuditMutation.isPending ? '正在提交' : '提交审核',
        },
  ]

  const deployButton = (
    <Button
      type={isDeployed ? 'default' : 'primary'}
      icon={
        <Rocket
          className="size-4"
          aria-hidden="true"
        />
      }
      loading={deployMutation.isPending}
      disabled={!appId}
      onClick={handleDeploy}
      className="h-8! rounded-full! px-3! text-sm! font-medium!"
    >
      {deployMutation.isPending ? '部署中' : isDeployed ? '已部署' : '部署应用'}
    </Button>
  )

  const deployInfoContent = (
    <div className="w-72 space-y-3">
      <div>
        <p className="text-xs font-medium text-slate-500">部署地址</p>
        {app?.deployUrl ? (
          <a
            href={app.deployUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex min-w-0 items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <span className="truncate">{app.deployUrl}</span>
            <ExternalLink
              className="size-3.5 shrink-0"
              aria-hidden="true"
            />
          </a>
        ) : (
          <p className="mt-1 text-sm text-slate-500">暂无部署地址</p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500">部署时间</p>
        <p className="mt-1 text-sm text-slate-800">{deployedAtText}</p>
      </div>
    </div>
  )

  return (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          className="flex size-9 shrink-0 transition-opacity hover:opacity-80"
          title="返回首页"
        >
          <img
            src={zhidaLogo}
            alt="Yida 易搭 Logo"
            className="h-full! w-full! max-w-full! object-contain"
          />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-5 text-slate-950">
            {app?.name || '应用工作台'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isDeployed ? (
          <Popover
            title="部署信息"
            content={deployInfoContent}
            placement="bottomRight"
          >
            {deployButton}
          </Popover>
        ) : (
          deployButton
        )}

        <Dropdown
          menu={{ items: moreMenuItems, onClick: handleMoreMenuClick }}
          placement="bottomRight"
          trigger={['hover']}
        >
          <Button
            type="default"
            icon={
              <MoreHorizontal
                className="size-4"
                aria-hidden="true"
              />
            }
            className="h-8! rounded-full! px-3! text-sm! font-medium!"
          >
            更多
          </Button>
        </Dropdown>
      </div>
    </>
  )
}
