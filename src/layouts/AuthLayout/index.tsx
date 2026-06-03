import yidaLogo from '@/assets/yida-logo.png'
import yidaLogoText from '@/assets/yida-text.png'
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Button, Flex, Layout, Tabs } from 'antd'
import type { TabsProps } from 'antd'
import type { ReactNode } from 'react'

const AUTH_TABS: TabsProps['items'] = [
  {
    key: 'login',
    label: (
      <span className="inline-flex items-center gap-1.5">
        <LogIn size={16} /> 登录
      </span>
    ),
    children: null,
  },
  {
    key: 'register',
    label: (
      <span className="inline-flex items-center gap-1.5">
        <UserPlus size={16} /> 注册
      </span>
    ),
    children: null,
  },
]

export default function AuthLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  const activeTabKey = location.pathname === '/auth/register' ? 'register' : 'login'

  const handleTabChange = (key: string) => {
    navigate({ to: key === 'register' ? '/auth/register' : '/auth/login' })
  }

  return (
    <Layout className="min-h-screen bg-white">
      <Button
        type="text"
        icon={<ArrowLeft />}
        onClick={() => navigate({ to: '/' })}
        className="fixed left-3 top-3 z-10 h-10 cursor-pointer rounded-lg bg-white/70 px-3 text-sm font-medium text-slate-500 shadow-sm shadow-slate-200/50 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 sm:left-6 sm:top-6 sm:text-base"
      >
        返回首页
      </Button>

      <Layout.Content className="relative flex justify-center px-6 pb-14 pt-20 sm:px-8 sm:pb-16 sm:pt-22">
        <Flex
          vertical
          className="w-full max-w-100 pt-[2vh] sm:pt-[4vh]"
        >
          <Flex
            vertical
            align="center"
            className="mb-8 text-center"
          >
            <Flex
              align="center"
              justify="center"
              gap={12}
            >
              <img
                src={yidaLogo}
                alt="易搭 Logo"
                className="h-20 w-20"
              />
              <h1 className="m-0 text-[40px] font-semibold tracking-tight text-slate-950"><img src={yidaLogoText} alt="易搭" className="h-9" /></h1>
            </Flex>
            <p className="mb-0 mt-3 text-sm leading-6 text-slate-500 sm:text-[15px]">
              统一认证入口
            </p>
          </Flex>

          <Flex
            vertical
            flex="1"
            className="min-h-105 px-1 sm:min-h-108 sm:px-0"
          >
            <Tabs
              activeKey={activeTabKey}
              centered
              size="large"
              items={AUTH_TABS}
              tabBarGutter={32}
              onChange={handleTabChange}
            />

            <div className="mt-6 flex-1">{children}</div>
          </Flex>
        </Flex>
      </Layout.Content>

      <Layout.Footer className="relative bg-transparent px-6 pb-8 pt-0 text-center text-xs leading-6 text-slate-400 sm:text-sm">
        <p>易搭低代码应用生成系统</p>
        <p>
          Designed by{' '}
          <a
            href="https://github.com/ymz6"
            target="_blank"
            rel="noreferrer"
            className="text-sky-500 no-underline hover:text-sky-600"
          >
            ymz
          </a>
        </p>
      </Layout.Footer>
    </Layout>
  )
}
