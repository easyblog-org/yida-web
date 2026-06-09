import yidaLogo from '@/assets/yida-logo.png'
import yidaLogoText from '@/assets/yida-logo-text.png'
import yidaText from '@/assets/yida-text.png'
import { useLogout } from '@/api/generated/endpoints/auth'
import { queryClient } from '@/libs/query-client'
import { useAuthSessionStore } from '@/stores/auth-session'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { App, Button, Dropdown, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import {
  Bookmark,
  ChevronDown,
  FolderKanban,
  Home,
  LayoutGrid,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { GithubOutlined } from '@ant-design/icons'

import { SlideDrawer } from '@/components/SlideDrawer'

/**
 * 基础的上中下布局
 */
const DEBUG_DRAWER = true

function drawerLog(tag: string, msg: string, data?: unknown) {
  if (!DEBUG_DRAWER) return
  console.log(`[BasicLayout-Drawer ${performance.now().toFixed(0)}ms] [${tag}] ${msg}`, data ?? '')
}

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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // ── 追踪汉堡按钮点击到抽屉打开的完整链路 ──
  const handleDrawerOpen = useCallback(() => {
    const t0 = performance.now()
    drawerLog('CLICK', '用户点击汉堡按钮', { pathname: location.pathname })

    // 检测主线程是否有长任务阻塞
    const beforeSetState = performance.now()
    setMobileDrawerOpen(true)
    const afterSetState = performance.now()

    drawerLog('SETSTATE', `setMobileDrawerOpen(true) 耗时 ${(afterSetState - beforeSetState).toFixed(1)}ms`, {
      fromClick: (afterSetState - t0).toFixed(1) + 'ms',
    })

    // 用 rAF 检测下一帧是否及时
    requestAnimationFrame(() => {
      const dt = (performance.now() - t0).toFixed(1)
      drawerLog('RAF1', `第一帧 rAF 触发，距点击 ${dt}ms`)
      if (parseFloat(dt) > 100) {
        drawerLog('WARN', '⚠️ 第一帧延迟超过 100ms！可能存在主线程阻塞')
      }
    })
    requestAnimationFrame(() => {
      const dt = (performance.now() - t0).toFixed(1)
      drawerLog('RAF2', `第二帧 rAF 触发，距点击 ${dt}ms`)
    })

    // 100ms 后检查是否已经渲染
    setTimeout(() => {
      const dt = (performance.now() - t0).toFixed(1)
      drawerLog('CHECK-100ms', `距点击 100ms 状态检查`, { dt })
    }, 100)
  }, [location.pathname])

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
    <Layout className="!bg-transparent min-h-screen">
      <Layout.Header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 px-0 backdrop-blur-sm max-md:fixed max-md:left-0 max-md:border-b-0 max-md:bg-transparent max-md:backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-2.5"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <div className="flex items-center justify-center sm:size-10 size-9">
              <img
                src={yidaLogo}
                alt="Logo"
                className="size-8 sm:size-9"
              />
            </div>
            <img src={yidaText} alt="易搭" className="h-6 sm:h-7" />
          </Link>

          {/* 桌面端水平导航菜单 */}
          <div className="hidden min-w-0 flex-1 pl-8 md:flex">
            <Menu
              mode="horizontal"
              items={menuItems}
              selectedKeys={[activeNavKey]}
              onClick={handleMenuClick}
              className="min-w-0 flex-1 border-none! bg-transparent!"
            />
          </div>

          {/* 移动端汉堡按钮 */}
          <button
            type="button"
            onClick={handleDrawerOpen}
            className="ml-auto flex size-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            aria-label="打开菜单"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 桌面端用户区域 */}
          <div className="hidden md:flex md:flex-1 md:items-center md:justify-end">
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
        </div>
      </Layout.Header>
      <Layout.Content>
        <div className="mx-auto w-full max-w-300 pt-6">
          <div className="md:hidden" style={{ height: '56px', pointerEvents: 'none' }} aria-hidden="true" />
          {children}
        </div>
      </Layout.Content>
      <Layout.Footer className="!bg-transparent px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          {/* 移动端：极简版权信息 */}
          <div className="flex flex-col items-center gap-3 text-center md:hidden">
            <Link to="/" className="group inline-flex items-center gap-2">
              <img src={yidaLogo} alt="Logo" className="size-6" />
              <span className="text-sm font-semibold text-slate-700"><img src={yidaLogoText} alt="易搭" className="h-4" /></span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-400">
              AI 驱动的零代码应用构建平台
            </p>
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} 易搭 AI 零代码应用生成平台
            </p>
          </div>

          {/* 桌面端：完整页脚 */}
          <div className="hidden md:grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            {/* 品牌列 */}
            <div>
              <Link to="/" className="group inline-flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center">
                  <img src={yidaLogo} alt="Logo" className="size-7" />
                </div>
                <span className="text-lg font-semibold text-slate-800"><img src={yidaLogoText} alt="易搭" className="h-5" /></span>
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                AI 驱动的零代码应用构建平台，从想法到上线，只需一次对话。
              </p>
            </div>

            {/* 产品 */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">产品</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link to="/" className="text-sm text-slate-500 transition-colors hover:text-indigo-600">
                    首页
                  </Link>
                </li>
                <li>
                  <Link to="/cases" className="text-sm text-slate-500 transition-colors hover:text-indigo-600">
                    案例广场
                  </Link>
                </li>
              </ul>
            </div>

            {/* 关于 */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">关于</h3>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="https://www.xinxinnote.tech/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-slate-500 transition-colors hover:text-indigo-600"
                  >
                    关于我
                  </a>
                </li>
                <li>
                  <Link to="/about" className="text-sm text-slate-500 transition-colors hover:text-indigo-600">
                    关于本项目
                  </Link>
                </li>
              </ul>
            </div>

            {/* 联系方式（桌面端显示） */}
            <div className="hidden lg:block">
              <h3 className="mb-4 text-sm font-semibold text-slate-800">联系方式</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="text-sm text-slate-600">huangxin981230@163.com</span>
                </li>
                <li>
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="text-sm text-slate-600">hx95162437</span>
                  </div>
                  <p className="mt-1 pl-6 text-xs text-slate-400">添加好友请备注"合作"</p>
                </li>
                <li className="flex items-center gap-2.5">
                  <GithubOutlined className="size-[18px] shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="text-sm text-slate-600">
                    <a href="https://github.com/LoverITer" className="text-sm text-slate-500 transition-colors hover:text-indigo-600">GitHub / LoverITer</a>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* 分割线 + 版权（仅桌面端） */}
          <div className="hidden md:block">
            <div className="my-8 h-px bg-slate-200/60" />

            {/* 底部：版权信息 */}
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} 易搭 AI 零代码应用生成平台
              </p>
              <p className="text-xs text-slate-400">
                Designed by{' '}
                <a
                  href="https://www.xinxinnote.tech/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-500 no-underline transition-colors hover:text-indigo-500"
                >
                  Xinxinnote Tech
                </a>
              </p>
            </div>
          </div>
        </div>
      </Layout.Footer>

      {/* 移动端侧边抽屉 */}
      <SlideDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        placement="right"
        width={280}
        className="md:hidden"
      >
        {/* 关闭按钮 */}
        <div className="flex justify-end p-4 pb-0">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭菜单"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isAuthenticated ? (
          <>
            {/* 用户信息区 */}
            <div className="px-6 pt-4 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-medium text-slate-600">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={userDisplayName} className="size-full object-cover" />
                  ) : (
                    userDisplayInitial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900">{userDisplayName}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    ID: {user?.id ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* 快捷入口 */}
            <div className="grid grid-cols-2 gap-3 px-6 pb-4">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  void navigate({ to: '/' })
                }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 py-4 text-sm font-medium text-slate-700 transition-colors active:bg-slate-100"
              >
                <Home className="size-5 text-slate-500" />
                首页
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  void navigate({ to: '/profile' })
                }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 py-4 text-sm font-medium text-slate-700 transition-colors active:bg-slate-100"
              >
                <LayoutGrid className="size-5 text-slate-500" />
                个人中心
              </button>
            </div>

            {/* 分割线 */}
            <div className="mx-6 my-2 h-px bg-slate-200/60" />

            {/* 功能菜单列表 */}
            <nav className="flex-1 overflow-y-auto px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  void navigate({ to: '/cases' })
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-700 transition-colors active:bg-slate-100"
              >
                <LayoutGrid className="size-4.5 text-slate-400" />
                案例广场
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  void navigate({ to: '/profile' })
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-700 transition-colors active:bg-slate-100"
              >
                <FolderKanban className="size-4.5 text-slate-400" />
                我的作品
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  void navigate({ to: '/profile' })
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-700 transition-colors active:bg-slate-100"
              >
                <Bookmark className="size-4.5 text-slate-400" />
                我的收藏
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false)
                    void navigate({ to: '/admin' })
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-700 transition-colors active:bg-slate-100"
                >
                  <ShieldCheck className="size-4.5 text-slate-400" />
                  后台系统
                </button>
              )}
            </nav>

            {/* 底部退出登录 */}
            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  confirmLogout()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-red-500 transition-colors active:bg-red-50"
              >
                <LogOut className="size-4.5" />
                退出登录
              </button>
            </div>
          </>
        ) : (
          /* 未登录状态 */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <p className="text-sm text-slate-500">登录后享受更多功能</p>
            <button
              type="button"
              onClick={() => {
                setMobileDrawerOpen(false)
                void navigate({ to: '/auth/login' })
              }}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-medium text-white transition-colors active:bg-blue-600"
            >
              登录 / 注册
            </button>
          </div>
        )}
      </SlideDrawer>
    </Layout>
  )
}
