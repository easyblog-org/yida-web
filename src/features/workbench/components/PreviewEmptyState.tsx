import { AppWindow, Sparkles } from 'lucide-react'

export function PreviewEmptyState({
  errorMessage,
  errorTitle,
  isGenerating,
  isLoading,
}: {
  errorMessage?: string
  errorTitle?: string
  isGenerating?: boolean
  isLoading?: boolean
}) {
  const isResourceNotFound = /不存在|未生成|暂无|not found|not generated/i.test(
    errorMessage ?? '',
  )
  const title = errorMessage
    ? (errorTitle ?? '生成未完成')
    : isGenerating
      ? '正在生成预览'
      : isLoading
        ? '正在加载预览'
        : '等待加载预览'
  const description = (() => {
    if (errorMessage) {
      return isResourceNotFound
        ? '应用代码还未生成完毕，完成后这里将自动展示运行效果。'
        : errorMessage
    }
    return isLoading
      ? '正在建立预览会话，请稍候。'
      : '应用生成后，这里将实时展示运行效果和交互反馈。'
  })()
  const icon = isResourceNotFound && !isGenerating && !isLoading

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
          {icon ? (
            <Sparkles className="size-6 text-amber-500" />
          ) : (
            <AppWindow className="size-6 text-indigo-500" />
          )}
        </div>
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}
