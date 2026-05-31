import zhidaLogo from '@/assets/zhida-logo.svg'
import { useLogout } from '@/api/generated/endpoints/auth'
import { queryClient } from '@/libs/query-client'
import { useAuthSessionStore } from '@/stores/auth-session'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { App, Avatar, Button, ConfigProvider, Dropdown, Flex, Layout, Menu, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Globe,
  LogOut,
  Star,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

const { Link: TypographyLink, Text } = Typography

const adminMenuItems = [
  {
    key: '/admin',
    label: 'LLM调用明细',
    icon: <Activity className="size-4" />,
  },
  {
    key: '/admin/users',
    label: '用户管理',
    icon: <Users className="size-4" />,
  },
  {
    key: '/admin/case-audits',
    label: '案例审核管理',
    icon: <ClipboardCheck className="size-4" />,
  },
  {
    key: '/admin/app-cases',
    label: '应用案例管理',
    icon: <Star className="size-4" />,
  },
] satisfies NonNullable<MenuProps['items']>

function getSelectedKey(pathname: string) {
  if (pathname.startsWith('/admin/case-audits')) {
    return '/admin/case-audits'
  }

  if (pathname.startsWith('/admin/app-cases')) {
    return '/admin/app-cases'
  }

  if (pathname.startsWith('/admin/users')) {
    return '/admin/users'
  }

  return '/admin'
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { message, modal } = App.useApp()
  const userInfo = useAuthSessionStore((state) => state.user)
  const logoutMutation = useLogout()
  const selectedKey = getSelectedKey(location.pathname)
  const [collapsed, setCollapsed] = useState(false)
  const userDisplayName = userInfo?.nickname?.trim() || '未设置'
  const userDisplayInitial = userInfo?.nickname?.trim().slice(0, 1).toUpperCase()

  const finishLogout = (successMessage: string) => {
    useAuthSessionStore.getState().clearSession()
    queryClient.clear()
    message.success(successMessage)
    void navigate({
      to: '/auth/login',
      replace: true,
    })
  }

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
          finishLogout('退出登录成功')
        } catch (error: any) {
          message.error(error.message)
          throw error
        }
      },
    })
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const targetKey = String(key)

    if (targetKey === '/admin/users') {
      void navigate({ to: '/admin/users' })
      return
    }

    if (targetKey === '/admin/case-audits') {
      void navigate({ to: '/admin/case-audits' })
      return
    }

    if (targetKey === '/admin/app-cases') {
      void navigate({ to: '/admin/app-cases' })
      return
    }

    if (targetKey === '/admin') {
      void navigate({ to: '/admin' })
    }
  }

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'site') {
      void navigate({ to: '/' })
      return
    }

    if (key === 'logout') {
      confirmLogout()
    }
  }

  return (
    <Layout className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <Layout.Header className="fixed inset-x-0 top-0 z-50 h-18! border-b border-stone-200/85 bg-[#fffefd]/82 px-0! backdrop-blur-sm">
        <Flex
          align="center"
          justify="space-between"
          className="h-full px-5 lg:px-7"
        >
          <Flex
            align="center"
            gap={12}
            className="min-w-0"
          >
            <div className="shrink-0">
              <img
                src={zhidaLogo}
                alt="智搭 Logo"
                className="size-14"
              />
            </div>
            <div className="min-w-0">
              <Text className="block truncate text-2xl font-semibold tracking-tight text-slate-900">
                智搭后台
              </Text>
            </div>
          </Flex>

          <Dropdown
            menu={{
              items: [
                {
                  key: 'site',
                  label: '前台系统',
                  icon: <Globe className="size-4" />,
                },
                {
                  key: 'logout',
                  label: '退出登录',
                  danger: true,
                  icon: <LogOut className="size-4" />,
                },
              ],
              onClick: handleUserMenuClick,
              className:
                '!w-32 !min-w-0 [&_.ant-dropdown-menu-item]:justify-center [&_.ant-dropdown-menu-item]:px-3 [&_.ant-dropdown-menu-item]:text-center [&_.ant-dropdown-menu-title-content]:flex-none',
            }}
            placement="bottomRight"
            arrow
            trigger={['hover']}
          >
            <Button
              type="text"
              className="group h-auto! rounded-2xl! px-2! py-1! text-inherit! shadow-none! hover:bg-[#f7f7f4]! [&.ant-dropdown-open_.user-dropdown-chevron]:rotate-180"
            >
              <Flex
                align="center"
                gap={12}
              >
                <Avatar
                  src={userInfo?.avatar}
                  className="bg-slate-900! text-xs! font-semibold!"
                >
                  {userDisplayInitial}
                </Avatar>
                <Flex
                  vertical
                  className="text-left"
                >
                  <Text className="block truncate text-sm font-medium text-slate-800">
                    {userDisplayName}
                  </Text>
                </Flex>
                <ChevronDown className="user-dropdown-chevron size-4 text-slate-400 transition-[color,transform] duration-200 group-hover:text-slate-600" />
              </Flex>
            </Button>
          </Dropdown>
        </Flex>
      </Layout.Header>

      <Layout
        hasSider
        className="bg-transparent pt-18"
      >
        <Layout.Sider
          width={248}
          collapsedWidth={80}
          collapsed={collapsed}
          trigger={null}
          className="sticky top-18 h-[calc(100vh-72px)] overflow-visible! border-r! border-stone-200/85! bg-transparent!"
        >
          <div className="relative flex h-full flex-col bg-[#fffefd]/62 backdrop-blur-sm">
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <ConfigProvider
                theme={{
                  components: {
                    Menu: {
                      itemBg: 'transparent',
                      itemMarginInline: 4,
                      itemMarginBlock: 4,
                      itemColor: '#525252',
                      itemHoverColor: '#525252',
                      itemSelectedBg: '#f3f4f6',
                      itemSelectedColor: '#2563eb',
                      itemActiveBg: '#f5f5f4',
                      itemBorderRadius: 12,
                    },
                  },
                }}
              >
                <Menu
                  mode="inline"
                  inlineCollapsed={collapsed}
                  items={adminMenuItems}
                  selectedKeys={[selectedKey]}
                  onClick={handleMenuClick}
                  className="border-none! bg-transparent! [&_.ant-menu-item]:text-stone-600 [&_.ant-menu-item-icon]:text-stone-500 [&_.ant-menu-item-selected_.ant-menu-item-icon]:text-blue-600"
                />
              </ConfigProvider>
            </div>

            <Button
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
              shape="circle"
              icon={
                collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />
              }
              className="absolute -right-3 top-16 z-10 size-7! min-w-7! border-stone-200! bg-[#fffefd]! p-0! text-stone-400! shadow-sm transition-colors hover:text-blue-500!"
            />
          </div>
        </Layout.Sider>

        <Layout className="min-h-[calc(100vh-72px)] bg-transparent">
          <Layout.Content className="flex-1 p-6">{children}</Layout.Content>
          <Layout.Footer className="bg-transparent! px-6! py-4!">
            <Flex
              align="center"
              justify="center"
              gap={10}
              wrap="wrap"
            >
              <Text className="text-sm text-slate-400">
                © {new Date().getFullYear()}{' '}
                <Text className="font-medium text-slate-600">Yida 易搭低代码应用生成系统</Text>
              </Text>
              <Text className="text-sm text-slate-300">·</Text>
              <Text className="text-sm text-slate-400">
                Designed by{' '}
                <TypographyLink
                  href="https://github.com/ymz6"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-sky-500! no-underline! hover:text-sky-600!"
                >
                  ymz
                </TypographyLink>
              </Text>
            </Flex>
          </Layout.Footer>
        </Layout>
      </Layout>
    </Layout>
  )
}
