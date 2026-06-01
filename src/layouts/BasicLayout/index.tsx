import yidaLogo from '@/assets/yida-logo.svg'
import { useLogout } from '@/api/generated/endpoints/auth'
import { queryClient } from '@/libs/query-client'
import { useAuthSessionStore } from '@/stores/auth-session'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { App, Button, Dropdown, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { ChevronDown, LogOut, ShieldCheck, User } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * 基础的上中下布局
 */
export default function BasicLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { message, modal } = App.useApp()
  const isAuthenticated = useAuthSessionStore((state) => Boolean(state.accessToken))
  const user = useAuthSessionStore((state) => state.user)
  const logoutMutation = useLogout()
  const isAdmin = user?.role === 1
  const userDisplayName = user?.nickname?.trim() || '未设置'
  const userDisplayInitial = user?.nickname?.trim().slice(0, 1).toUpperCase()

  const confirmLogout = () => {
    modal.confirm({
      centered: true,
      title: '确认退出登录？',
      content: '退出后需要重新登录才能继续访问受保护内容。',
      okText: '退出登录',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          await logoutMutation.mutateAsync()
          useAuthSessionStore.getState().clearSession()
          queryClient.clear()
          message.success('退出登录成功')
          void navigate({
            to: '/auth/login',
            replace: true,
          })
        } catch (error: any) {
          message.error(error.message)
          throw error
        }
      },
    })
  }

  const navItems = [
    { key: '/', label: '首页' },
    { key: '/cases', label: '案例广场' },
    { key: '/about', label: '关于' },
  ]

  const menuItems: MenuProps['items'] = navItems.map((item) => ({
    key: item.key,
    label: item.label,
  }))

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === '/cases') {
      void navigate({ to: '/cases' })
      return
    }

    if (key === '/about') {
      void navigate({ to: '/about' })
      return
    }

    void navigate({ to: '/' })
  }

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人中心',
      icon: <User className="size-4" />,
    },
    isAdmin
      ? {
        key: 'admin',
        label: '后台系统',
        icon: <ShieldCheck className="size-4" />,
      }
      : null,
    { type: 'divider' },
    {
      key: 'logout',
      label: '退出登录',
      danger: true,
      icon: <LogOut className="size-4" />,
    },
  ]

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') {
      void navigate({ to: '/profile' })
      return
    }

    if (key === 'admin') {
      void navigate({ to: '/admin' })
      return
    }

    if (key === 'logout') {
      confirmLogout()
    }
  }

  // 用“最长前缀匹配”确定当前激活导航：/aaa/bbb 会命中 /aaa；多个命中取最长；'/' 仅在根路径激活
  const activeNavKey =
    navItems
      .filter((item) => item.key !== '/' && location.pathname.startsWith(item.key))
      .reduce<string>((best, item) => (item.key.length > best.length ? item.key : best), '') ||
    (location.pathname === '/' ? '/' : '')

  return (
    <Layout className="min-h-screen">
      <Layout.Header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 px-0 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="flex size-9 items-center justify-center rounded-[12px] shadow-sm sm:size-10">
              <img
                src={yidaLogo}
                alt="Logo"
                className="h-16 w-16"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Yida
            </span>
          </Link>

          <div className="flex min-w-0 flex-1 pl-8">
            <Menu
              mode="horizontal"
              items={menuItems}
              selectedKeys={[activeNavKey]}
              onClick={handleMenuClick}
              className="min-w-0 flex-1 border-none! bg-transparent!"
            />
          </div>

          {isAuthenticated ? (
            <Dropdown
              menu={{
                items: dropdownItems,
                onClick: handleUserMenuClick,
                className:
                  '!w-32 !min-w-0 [&_.ant-dropdown-menu-item]:justify-center [&_.ant-dropdown-menu-item]:px-3 [&_.ant-dropdown-menu-item]:text-center [&_.ant-dropdown-menu-title-content]:flex-none',
              }}
              placement="bottomRight"
              trigger={['hover']}
            >
              <Button
                type="text"
                shape="round"
                className="group flex h-auto shrink-0 items-center gap-2 px-2! py-1! hover:bg-slate-100/90 [&.ant-dropdown-open_.user-dropdown-chevron]:rotate-180"
              >
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={userDisplayName}
                      className="size-full object-cover"
                    />
                  ) : (
                    userDisplayInitial
                  )}
                </div>
                <span className="max-w-28 truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900">
                  {userDisplayName}
                </span>
                <ChevronDown className="user-dropdown-chevron size-4 text-slate-400 transition-[color,transform] duration-200 group-hover:text-slate-600" />
              </Button>
            </Dropdown>
          ) : (
            <Button
              type="primary"
              onClick={() => void navigate({ to: '/auth/login' })}
              className="h-10 rounded-full px-4! text-sm font-medium shadow-sm shadow-blue-200/60"
            >
              登录 / 注册
            </Button>
          )}
        </div>
      </Layout.Header>
      <Layout.Content className="p-8">
        <div className="mx-auto w-full max-w-300">{children}</div>
      </Layout.Content>
      <Layout.Footer>
        <div className="text-center">
          <p className="m-0 text-sm text-slate-500">
            © {new Date().getFullYear()}{' '}
            <span className="font-medium text-slate-600">Yida 易搭 AI 零代码应用生成平台</span>. Designed by{' '}
            <a
              href="https://www.xinxinnote.tech/"
              target="_blank"
              rel="noreferrer"
              className="text-sky-500 no-underline hover:text-sky-600"
            >
              Xinxinnote Tech
            </a>
          </p>
        </div>
      </Layout.Footer>
    </Layout>
  )
}
