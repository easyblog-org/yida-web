import type { CreateAppRequest, CreateAppStreamMessage } from '@/api/generated/models'
import { useAuthSessionStore } from '@/stores/auth-session'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { useNavigate } from '@tanstack/react-router'
import { App, Button, Input, Steps, Tag } from 'antd'
import { ArrowUp, Code2, Globe, LayoutDashboard, Rocket, Sparkles, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FeaturedCasesSection } from '../components/FeaturedCasesSection'
import { useTypewriterPlaceholder } from '../hooks/useTypewriterPlaceholder'

const { TextArea } = Input

const typewriterPrompts = [
  '创建一个咖啡店会员管理后台，包含订单、积分和活动配置',
  '生成一个企业官网，展示服务、案例、团队和联系方式',
]

const loginExpiredMessage = '登录状态已失效，请重新登录'

const createAppSteps = [
  {
    step: 'APP_CREATING',
    title: '创建应用',
    description: '正在创建应用',
  },
  {
    step: 'TEMPLATE_COPYING',
    title: '初始化项目模板',
    description: '正在初始化项目模板',
  },
  {
    step: 'DEPENDENCY_INSTALLING',
    title: '安装依赖',
    description: '正在安装依赖',
  },
  {
    step: 'DONE',
    title: '创建完成',
    description: '应用创建完成',
  },
] as const

type CreateAppStep = (typeof createAppSteps)[number]['step']
type CreateAppStatus = 'idle' | 'creating' | 'success'

const createAppStepIndexMap = createAppSteps.reduce(
  (acc, item, index) => {
    acc[item.step] = index
    return acc
  },
  {} as Record<CreateAppStep, number>,
)

function isCreateAppStep(step: CreateAppStreamMessage['step']): step is CreateAppStep {
  return Boolean(step && step in createAppStepIndexMap)
}

function getErrorMessage(error: unknown, fallback: string) {
  const responseErrorMessage =
    typeof error === 'object' && error && 'message' in error ? error.message : undefined

  return typeof responseErrorMessage === 'string' && responseErrorMessage.trim()
    ? responseErrorMessage
    : fallback
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function HomePage() {
  const navigate = useNavigate()
  const promptPlaceholder = useTypewriterPlaceholder(typewriterPrompts)
  const { message } = App.useApp()
  const accessToken = useAuthSessionStore((state) => state.accessToken)
  const clearSession = useAuthSessionStore((state) => state.clearSession)
  const [prompt, setPrompt] = useState('')
  const [createAppStatus, setCreateAppStatus] = useState<CreateAppStatus>('idle')
  const [createAppCurrentStep, setCreateAppCurrentStep] = useState<CreateAppStep>('APP_CREATING')
  const [createAppStreamMessage, setCreateAppStreamMessage] = useState('正在创建应用')
  const [dependencyInstallDotCount, setDependencyInstallDotCount] = useState(1)
  const createAppAbortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  const isCreateAppBusy = createAppStatus !== 'idle'
  const createAppCurrentStepIndex = createAppStepIndexMap[createAppCurrentStep]
  const isInstallingDependencies =
    createAppStatus === 'creating' && createAppCurrentStep === 'DEPENDENCY_INSTALLING'
  const currentCreateAppMessage = isInstallingDependencies
    ? `正在安装依赖${'.'.repeat(dependencyInstallDotCount)}`
    : createAppStreamMessage
  const createAppStepItems = createAppSteps.map((item, index) => ({
    title: item.title,
    content: index === createAppCurrentStepIndex ? currentCreateAppMessage : item.description,
  }))

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      createAppAbortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!isInstallingDependencies) {
      setDependencyInstallDotCount(1)
      return
    }

    const intervalId = window.setInterval(() => {
      setDependencyInstallDotCount((dotCount) => (dotCount >= 3 ? 1 : dotCount + 1))
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [isInstallingDependencies])

  const enterWorkbench = async (appId: string) => {
    try {
      if (!isMountedRef.current) {
        return
      }

      setCreateAppStatus('success')
      message.success('应用创建成功，即将进入工作台')
      await delay(800)

      if (!isMountedRef.current) {
        return
      }

      // 创建成功后进入对应应用工作台，后续生成过程由工作台承接展示。
      await navigate({
        to: '/workbench/$appId',
        params: { appId },
      })
    } catch (error) {
      if (!isMountedRef.current) {
        return
      }

      setCreateAppStatus('idle')
      message.error(getErrorMessage(error, '进入工作台失败，请稍后重试'))
    }
  }

  const handleCreateApp = async () => {
    if (isCreateAppBusy) {
      return
    }

    const nextPrompt = prompt.trim()

    if (!nextPrompt) {
      message.warning('请先描述你想生成的应用')
      return
    }

    if (nextPrompt.length > 4000) {
      message.warning('需求描述不能超过 4000 个字符')
      return
    }

    if (!accessToken) {
      message.warning('请先登录后创建应用')
      void navigate({ to: '/auth/login' })
      return
    }

    const createAppRequest: CreateAppRequest = {
      initPrompt: nextPrompt,
    }
    const abortController = new AbortController()
    let createdAppId: string | undefined
    let streamErrorMessage: string | undefined
    let isTerminalEventHandled = false

    createAppAbortControllerRef.current = abortController
    setCreateAppStatus('creating')
    setCreateAppCurrentStep('APP_CREATING')
    setCreateAppStreamMessage('正在创建应用')

    try {
      await fetchEventSource('/api/apps', {
        method: 'POST',
        headers: {
          accept: EventStreamContentType,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(createAppRequest),
        signal: abortController.signal,
        openWhenHidden: true,
        async onopen(response) {
          if (response.status === 401) {
            throw new Error(loginExpiredMessage)
          }

          if (!response.ok) {
            throw new Error('应用创建请求失败，请稍后重试')
          }

          const contentType = response.headers.get('content-type') ?? ''

          if (!contentType.startsWith(EventStreamContentType)) {
            throw new Error('应用创建接口未返回有效的 SSE 流')
          }
        },
        onmessage(event) {
          const eventData = event.data.trim()

          if (!eventData) {
            return
          }

          let streamMessage: CreateAppStreamMessage

          try {
            streamMessage = JSON.parse(eventData) as CreateAppStreamMessage
          } catch {
            throw new Error('应用创建进度解析失败，请稍后重试')
          }

          if (isTerminalEventHandled) {
            return
          }

          if (streamMessage.step === 'ERROR') {
            streamErrorMessage = streamMessage.message?.trim() || '应用创建失败，请稍后重试'
            isTerminalEventHandled = true
            abortController.abort()
            setCreateAppStatus('idle')
            message.error(streamErrorMessage)
            return
          }

          if (!isCreateAppStep(streamMessage.step)) {
            return
          }

          setCreateAppCurrentStep(streamMessage.step)
          setCreateAppStreamMessage(
            streamMessage.message?.trim() ||
            createAppSteps[createAppStepIndexMap[streamMessage.step]].description,
          )

          if (streamMessage.step === 'DONE') {
            createdAppId = String(streamMessage.appId ?? '').trim()
            isTerminalEventHandled = true
            abortController.abort()

            if (!createdAppId) {
              setCreateAppStatus('idle')
              message.error('应用创建完成但未返回应用 ID，请稍后重试')
              return
            }

            void enterWorkbench(createdAppId)
          }
        },
        onclose() {
          if (!createdAppId && !streamErrorMessage && !abortController.signal.aborted) {
            streamErrorMessage = '应用创建连接已断开，请稍后重试'
          }
        },
        onerror(error) {
          throw error
        },
      })

      if (!isMountedRef.current) {
        return
      }

      if (isTerminalEventHandled) {
        return
      }

      if (streamErrorMessage) {
        throw new Error(streamErrorMessage)
      }

      if (!createdAppId) {
        throw new Error('应用创建完成但未返回应用 ID，请稍后重试')
      }

      await enterWorkbench(createdAppId)
    } catch (error) {
      const fallbackErrorMessage = '应用创建失败，请稍后重试'
      const errorMessage = getErrorMessage(error, fallbackErrorMessage)

      if (!isMountedRef.current) {
        return
      }

      if (isTerminalEventHandled) {
        return
      }

      if (errorMessage === loginExpiredMessage) {
        clearSession()
        void navigate({ to: '/auth/login' })
      }

      setCreateAppStatus('idle')
      message.error(errorMessage)
    } finally {
      if (createAppAbortControllerRef.current === abortController) {
        createAppAbortControllerRef.current = null
      }
    }
  }

  const quickTags = [
    { label: '企业官网', prompt: '生成一个现代企业官网，采用深色科技风格，包含：首页（全屏 Hero 区域 + 核心数据展示）、产品/服务展示页（卡片式布局 + 悬停动效）、关于我们（团队介绍 + 发展历程时间轴）、新闻动态（文章列表 + 分类筛选）、联系我们（表单验证 + 地图嵌入）。要求响应式设计，支持暗色模式切换，导航栏固定顶部带滚动变色效果。' },
    { label: '个人博客', prompt: '创建一个个人技术博客系统，功能包括：首页（精选文章轮播 + 热门标签云）、文章列表（分页 + 搜索 + 分类/标签多维度筛选）、文章详情页（Markdown 渲染 + 目录导航 + 代码高亮 + 阅读进度条）、关于页面（个人信息卡片 + 技能图谱 + 社交链接）。支持文章点赞收藏评论，侧边栏显示最近文章和归档，整体采用极简阅读优先的排版设计。' },
    { label: '数据仪表板', prompt: '开发一个数据可视化仪表板后台，包含：顶部统计卡片区（今日访问量、活跃用户、收入趋势等关键指标 + 同比环比对比）、中部图表区（折线图展示趋势、柱状图对比分析、饼图占比分布、地图热力图）、数据表格区（可排序筛选导出的数据列表 + 行内编辑功能）。左侧可折叠菜单导航，支持主题色自定义和数据刷新频率设置。' },
  ]

  const capabilityBadges = [
    { icon: Globe, text: '网站' },
    { icon: LayoutDashboard, text: '后端管理系统' },
    { icon: Smartphone, text: '小程序' },
    { icon: Code2, text: 'API' },
  ]

  return (
    <main className="relative min-h-[calc(100vh-10rem)] overflow-hidden py-6 sm:py-5">
      {isCreateAppBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-6 text-center shadow-2xl shadow-slate-950/20">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-blue-50/70">
              <Sparkles
                className="size-6 animate-pulse"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5 text-base font-semibold text-slate-950">
              {createAppStatus === 'success'
                ? '应用创建成功，正在进入工作台'
                : '应用创建中，请不要离开此页面'}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              {createAppStatus === 'success'
                ? '稍等片刻，马上为你打开应用工作台。'
                : currentCreateAppMessage}
            </div>
            <Steps
              orientation="vertical"
              current={createAppCurrentStepIndex}
              status={createAppStatus === 'success' ? 'finish' : 'process'}
              items={createAppStepItems}
              className="mx-auto mt-6 max-w-xs text-left"
            />
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/40" />
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/8 blur-[120px]" />
        <div className="absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/6 blur-[100px]" />
      </div>

      <section className="relative mx-auto flex min-h-124 max-w-4xl flex-col items-center justify-center text-center">
        <h1 className="text-balance font-['Microsoft_YouYuan','YouYuan','幼圆','Microsoft_YaHei_UI',sans-serif] text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          说出想法，AI 即刻生成应用
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
          从想法到上线，只需一次对话
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {capabilityBadges.map(({ icon: Icon, text }) => (
            <span
              key={text}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm text-slate-600 shadow-sm backdrop-blur-sm"
            >
              <Icon className="size-3.5 text-blue-500" />
              {text}
            </span>
          ))}
        </div>

        <div className="group relative mt-8 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-[2px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.12)] focus-within:border-blue-300/80 focus-within:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.15)]">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-700 ease-out group-focus-within:opacity-100 group-focus-within:scale-[1.01]">
            <div className="absolute top-1/2 left-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2 blur-sm">
              <div className="h-full w-full animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,#3b82f6,#6366f1,#8b5cf6,#a855f7,#6366f1,#3b82f6)] opacity-80" />
            </div>
          </div>

          <div className="relative z-10 h-full w-full rounded-[14px] bg-white px-6 py-5 text-left">
            <label
              htmlFor="home-app-prompt"
              className="sr-only"
            >
              应用需求
            </label>
            <TextArea
              id="home-app-prompt"
              variant="borderless"
              autoSize={{ minRows: 3, maxRows: 8 }}
              maxLength={4000}
              disabled={isCreateAppBusy}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  if (!isCreateAppBusy && prompt.trim()) {
                    handleCreateApp()
                  }
                }
              }}
              placeholder={promptPlaceholder}
              className="max-h-56 min-h-28 resize-none px-0! pt-2! text-base! leading-[1.8]! text-slate-800! placeholder:text-slate-400!"
            />

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {quickTags.map((tag) => (
                  <Tag
                    key={tag.label}
                    className="cursor-pointer rounded-full! border-slate-200! bg-slate-50! px-2.5! py-0.5! text-xs! text-slate-500! transition-colors hover:border-blue-300! hover:bg-blue-50! hover:text-blue-600!"
                    onClick={() => {
                      if (!isCreateAppBusy) {
                        setPrompt(tag.prompt)
                      }
                    }}
                  >
                    {tag.label}
                  </Tag>
                ))}
              </div>
              <Button
                htmlType="button"
                type="primary"
                shape="circle"
                loading={isCreateAppBusy}
                disabled={isCreateAppBusy || !prompt.trim()}
                onClick={handleCreateApp}
                aria-label="生成应用"
                icon={
                  <ArrowUp
                    className="size-4"
                    aria-hidden="true"
                  />
                }
                className={`size-9! shrink-0! rounded-full! border-0! shadow-md transition-all duration-300 ${prompt.trim()
                  ? 'bg-slate-950! text-white! shadow-slate-950/20! hover:-translate-y-0.5 hover:scale-105 hover:bg-slate-800! hover:shadow-lg active:scale-95!'
                  : 'cursor-not-allowed! bg-slate-200! text-slate-400! shadow-none!'
                  }`}
              />
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          按 Enter 发送 · Shift+Enter 换行
        </p>
      </section>

      <section className="relative z-10 mx-auto mt-12 max-w-3xl">
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {[
            { step: 1, title: '描述想法', desc: '用自然语言描述你的需求', icon: Sparkles },
            { step: 2, title: 'AI 生成', desc: 'AI 自动生成完整应用', icon: Code2 },
            { step: 3, title: '一键部署', desc: '预览并发布上线', icon: Rocket },
          ].map((item, index) => (
            <div
              key={item.step}
              className="flex items-center gap-3 sm:gap-4"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:size-12">
                  <item.icon className="size-5 sm:size-6" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-0.5 hidden text-xs text-slate-500 sm:block">{item.desc}</div>
                </div>
              </div>
              {index < 2 && (
                <div className="mb-6 h-px w-8 bg-slate-200 sm:w-12" />
              )}
            </div>
          ))}
        </div>
      </section>

      <FeaturedCasesSection />
    </main>
  )
}
