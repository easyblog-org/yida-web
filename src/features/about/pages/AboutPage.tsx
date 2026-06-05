import { GithubOutlined } from '@ant-design/icons'
import {
  Code2,
  Layers,
  Mail,
  MessageCircle,
  Phone,
  Rocket,
  Sparkles,
} from 'lucide-react'
import yidaLogo from '@/assets/yida-logo.png'
import yidaLogoText from '@/assets/yida-logo-text.png'

const features = [
  {
    icon: Sparkles,
    title: 'AI 对话生成',
    desc: '通过自然语言描述需求，AI 自动生成完整应用',
  },
  {
    icon: Code2,
    title: '零代码搭建',
    desc: '无需编写代码，可视化拖拽即可完成应用构建',
  },
  {
    icon: Layers,
    title: '案例参考',
    desc: '浏览案例广场，获取灵感，快速复用成熟方案',
  },
  {
    icon: Rocket,
    title: '一键部署',
    desc: '应用生成后可直接部署上线，省去繁琐流程',
  },
]

const techStack = [
  { name: 'React', color: '#61DAFB' },
  { name: 'TypeScript', color: '#3178C6' },
  { name: 'Tailwind CSS', color: '#06B6D4' },
  { name: 'Vite', color: '#646CFF' },
  { name: 'Ant Design', color: '#1890FF' },
  { name: 'TanStack Router', color: '#FF6B35' },
  { name: 'TanStack Query', color: '#FF6B35' },
  { name: 'Zustand', color: '#7B3FF2' },
]

export function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/80 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/3 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 h-56 w-56 rounded-full bg-indigo-100/30 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-3">
            <img src={yidaLogo} alt="" aria-hidden="true" className="size-12" />
            <img src={yidaLogoText} alt="易搭" className="h-9" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            关于{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              易搭
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-500">
            AI 驱动的零代码应用构建平台，从想法到上线，只需一次对话。
            当前为 MVP 演示版本，持续迭代中。
          </p>
        </div>
      </section>

      {/* 产品功能 */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
          {features.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <item.icon className="size-5" />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-slate-800">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 技术栈 */}
      <section className="border-t border-slate-200/60 bg-slate-50/50 px-4 py-14 sm:px-6 lg:py-18">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-lg font-semibold text-slate-800">技术栈</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: tech.color }}
                />
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 关于作者 + 联系方式 */}
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-16 sm:px-6 lg:pb-28">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm sm:p-10">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">关于作者</h2>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            本项目由个人独立开发维护，目前处于 MVP 阶段。如果你对项目感兴趣或有任何建议，
            欢迎通过以下方式联系我。
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="size-4 shrink-0 text-slate-400" />
              <span className="text-sm text-slate-600">huangxin981230@163.com</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <MessageCircle className="size-4 shrink-0 text-slate-400" />
                <span className="text-sm text-slate-600">hx95152437</span>
              </div>
              <p className="mt-1 pl-7 text-xs text-slate-400">添加好友请备注"合作"</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="size-4 shrink-0 text-slate-400" />
              <span className="text-sm text-slate-600">+86 15709160159</span>
            </div>
            <div className="flex items-center gap-3">
              <GithubOutlined className="size-[18px] shrink-0 text-slate-400" />
              <a
                href="https://github.com/LoverITer"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-slate-500 transition-colors hover:text-indigo-600"
              >
                GitHub / LoverITer
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
