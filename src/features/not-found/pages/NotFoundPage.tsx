import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-50/60 blur-3xl" />
      </div>

      <div className="text-center">
        {/* 404 Number */}
        <h1 className="text-[120px] font-black leading-none tracking-tighter text-slate-200 sm:text-[160px]">
          404
        </h1>

        <p className="mt-2 text-lg text-slate-500 sm:text-xl">页面不存在</p>
        <p className="mt-2 text-sm text-slate-400">
          你访问的页面可能已被删除、移动，或地址输入有误
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          <ArrowLeft className="size-4" />
          返回首页
        </Link>
      </div>
    </div>
  )
}
