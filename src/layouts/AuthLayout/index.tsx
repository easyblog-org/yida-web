import yidaLogo from '@/assets/yida-logo.png'
import yidaLogoText from '@/assets/yida-text.png'
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Button, Layout, Tabs } from 'antd'
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
      {/* 返回按钮 */}
      <Button
        type="text"
        icon={<ArrowLeft />}
        onClick={() => navigate({ to: '/' })}
        className="fixed left-3 top-3 z-10 h-10 cursor-pointer rounded-lg bg-white/70 px-3 text-sm font-medium text-slate-500 shadow-sm shadow-slate-200/50 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 sm:left-6 sm:top-6 sm:text-base"
      >
        返回首页
      </Button>

      {/* 主内容区：移动端垂直居中，桌面端正常流式布局 */}
      <Layout.Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: window.innerWidth < 768 ? 'center' : 'flex-start',
          padding: 0,
          minHeight: '88vh',
        }}
        className="!px-8 !pb-10 !pt-18 sm:!px-8 sm:!pb-16 sm:!pt-22"
      >
        <div className="w-full max-w-[400px]">
          {/* Logo + 标题 */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img
                src={yidaLogo}
                alt="易搭 Logo"
                className="h-12 w-12 sm:h-20 sm:w-20"
              />
              <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-950 sm:text-[40px]">
                <img src={yidaLogoText} alt="易搭" className="h-5 sm:h-9" />
              </h1>
            </div>
            <p className="m-0 text-sm leading-6 text-slate-500">
              统一认证入口
            </p>
          </div>

          {/* Tab 切换 */}
          <Tabs
            activeKey={activeTabKey}
            centered
            size="large"
            items={AUTH_TABS}
            tabBarGutter={32}
            onChange={handleTabChange}
          />

          {/* 表单内容 */}
          <div className="mt-5">{children}</div>
        </div>
      </Layout.Content>

      {/* 底部版权 */}
      <Layout.Footer className="bg-transparent px-6 pb-8 pt-0 text-center text-xs leading-6 text-slate-400 sm:text-sm">
        <p>易搭 AI 零代码应用生成平台</p>
        <p>
          Designed by{' '}
          <a
            href="https://www.xinxinnote.tech/"
            target="_blank"
            rel="noreferrer"
            className="text-sky-500 no-underline hover:text-sky-600"
          >
            Xinxinnote Tech
          </a>
        </p>
      </Layout.Footer>
    </Layout>
  )
}
