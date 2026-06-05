import type { CreateAppRequest, CreateAppStreamMessage } from '@/api/generated/models'
import { useAuthSessionStore } from '@/stores/auth-session'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { useNavigate } from '@tanstack/react-router'
import { App, Button, Input } from 'antd'
import {
  ArrowUp,
  Code2,
  Shield,
  Sparkles,
  WandSparkles,
  Zap,
} from 'lucide-react'
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

  return (
    <>
      <main className="relative max-h-[calc(100vh-10rem)] overflow-hidden">
        <div className="pointer-events-none fixed inset-0 -z-10">
          {/* 基础渐变 */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/40" />

          {/* 顶部大光晕（移动端缩小以提升性能） */}
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-300/15 via-violet-300/10 to-transparent blur-[150px] sm:h-[1000px] sm:w-[1000px] sm:blur-[200px]" />

          {/* 右上光晕 */}
          <div className="absolute -right-48 -top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-l from-sky-300/15 via-blue-300/10 to-transparent blur-[120px] sm:h-[800px] sm:w-[800px] sm:blur-[180px]" />

          {/* 左侧中部暖色光晕 */}
          <div className="absolute -left-48 top-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-rose-300/10 via-purple-300/10 to-transparent blur-[120px] sm:h-[700px] sm:w-[700px] sm:blur-[180px]" />

          {/* 底部光晕 */}
          <div className="absolute -bottom-48 left-1/4 h-[400px] w-[500px] rounded-full bg-gradient-to-t from-indigo-400/15 via-violet-400/10 to-transparent blur-[120px] sm:h-[700px] sm:w-[900px] sm:blur-[200px]" />
        </div>

        {isCreateAppBusy ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.97] shadow-2xl shadow-black/10 backdrop-blur-xl">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500" />
              <div className="p-8 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-blue-100/80">
                  <Sparkles
                    className="size-7 animate-pulse text-blue-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-6 text-lg font-semibold tracking-tight text-slate-900">
                  {createAppStatus === 'success'
                    ? '应用创建成功'
                    : '正在为你构建应用'}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {createAppStatus === 'success'
                    ? '即将跳转到工作台页面...'
                    : currentCreateAppMessage}
                </p>
                <div className="mt-6 space-y-3 text-left">
                  {createAppStepItems.map((item, idx) => (
                    <div
                      key={item.title}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${idx === createAppCurrentStepIndex
                        ? 'bg-blue-50/80'
                        : idx < createAppCurrentStepIndex
                          ? ''
                          : 'opacity-40'
                        }`}
                    >
                      <div
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${idx < createAppCurrentStepIndex
                          ? 'bg-emerald-500 text-white'
                          : idx === createAppCurrentStepIndex
                            ? 'bg-blue-500 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-400'
                          }`}
                      >
                        {idx < createAppCurrentStepIndex ? (
                          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${idx <= createAppCurrentStepIndex ? 'text-slate-900' : 'text-slate-400'
                          }`}>
                          {item.title}
                        </div>
                        {idx === createAppCurrentStepIndex && (
                          <div className="mt-0.5 text-xs text-blue-600">{item.content}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="relative mx-auto flex min-h-[70vh] sm:min-h-[75vh] max-w-5xl flex-col items-center justify-center px-4 pt-8 pb-6 sm:min-h-[83.5vh] sm:pt-6">
          <div className="flex flex-col items-center text-center">
            <h1 className="mt-6 max-w-3xl text-balance text-2xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-6xl xl:text-[3.75rem]">
              说出想法，
              <span className="relative mx-2 inline-block">
                <span className="relative bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  AI
                </span>
                <span className="absolute -inset-x-2 -bottom-1 h-3 bg-blue-500/10 blur-xl -z-10 rounded-full" />
              </span>
              即刻生成应用
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base lg:text-base">
              从想法到上线，只需一次对话
            </p>
          </div>

          <div className="mt-10 w-full max-w-3xl">
            <div className="group relative">
              <div className="absolute -inset-1 rounded-[1.75rem] bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 opacity-0 blur-lg transition-opacity duration-500 group-focus-within:opacity-100" />

              <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 group-focus-within:border-indigo-300/50 group-focus-within:shadow-[0_8px_32px_-8px_rgba(99,102,241,0.1),0_2px_8px_-2px_rgba(0,0,0,0.04)]">
                <div className="relative z-10 px-5 py-4 sm:px-6 sm:py-5">
                  <label htmlFor="home-app-prompt" className="sr-only">应用需求</label>
                  <TextArea
                    id="home-app-prompt"
                    variant="borderless"
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    maxLength={4000}
                    disabled={isCreateAppBusy}
                    value={prompt}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(event.target.value)}
                    onPressEnter={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                      if (!e.shiftKey) {
                        e.preventDefault()
                        if (!isCreateAppBusy && prompt.trim()) {
                          handleCreateApp()
                        }
                      }
                    }}
                    placeholder={promptPlaceholder}
                    className="max-h-56 min-h-28 resize-none px-0! pt-1! text-[15px]! leading-[1.85]! text-slate-800! placeholder:text-slate-400! sm:text-base!"
                  />

                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100/80 pt-3">
                    <button
                      type="button"
                      onClick={() => message.info('提示词优化功能正在开发中，敬请期待')}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1.5 text-sm text-slate-500 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:text-indigo-600 hover:shadow-md active:scale-[0.97]"
                    >
                      <WandSparkles className="size-3.5" aria-hidden="true" />
                      优化
                    </button>
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
                      className={`size-10! shrink-0! rounded-full! border-0! shadow-md transition-all duration-300 ${prompt.trim()
                        ? 'bg-slate-950! text-white! shadow-slate-900/25! hover:-translate-y-0.5 hover:scale-105 hover:bg-slate-800! hover:shadow-lg active:scale-95!'
                        : 'cursor-not-allowed! bg-slate-200! text-slate-400! shadow-none!'
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible">
              {quickTags.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  disabled={isCreateAppBusy}
                  onClick={() => {
                    if (!isCreateAppBusy) {
                      setPrompt(tag.prompt)
                    }
                  }}
                  className="shrink-0 cursor-pointer rounded-full border border-slate-200/70 bg-white/80 px-4 py-1.5 text-sm text-slate-600 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:text-indigo-600 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tag.label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-center text-xs text-slate-400">
              按 Enter 发送 · Shift+Enter 换行
            </p>
          </div>

        </section>
      </main>

      <FeaturedCasesSection />
    </>
  )
}
