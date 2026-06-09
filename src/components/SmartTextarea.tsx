import { Tooltip } from 'antd'
import { ArrowUp } from 'lucide-react'
import { useCallback, useRef, type ReactNode } from 'react'

/** 通用智能输入框组件 */
export function SmartTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  loading,
  maxLength = 1000,
  submitOnEnter = true,
  /** 左侧插槽（如编辑按钮、字数统计） */
  leftSlot,
  /** 右侧自定义发送按钮（默认内置圆形发送按钮） */
  rightSlot,
  /** 发送按钮的 tooltip 提示文字 */
  sendTooltip,
  /** 是否禁用发送 */
  isSendDisabled,
  /** 顶部额外内容（如可视化编辑提示条） */
  topBanner,
  /** 自定义容器 className */
  containerClassName,
  /** 自定义输入框 className */
  textareaClassName,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => boolean
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  maxLength?: number
  submitOnEnter?: boolean
  leftSlot?: ReactNode
  rightSlot?: ReactNode
  sendTooltip?: string
  isSendDisabled?: boolean
  topBanner?: ReactNode
  containerClassName?: string
  textareaClassName?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxH = window.innerWidth < 400 ? 200 : 200
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    if (v.length > maxLength) {
      onChange(v.slice(0, maxLength))
      return
    }
    onChange(v)
    adjustHeight()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnEnter && e.key === 'Enter' && !e.shiftKey && !isSendDisabled && !disabled) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (disabled || isSendDisabled) return
    const trimmed = value.trim()
    if (!trimmed) return
    if (onSubmit(trimmed)) {
      onChange('')
      requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      })
    }
  }

  const isOverLimit = value.length >= maxLength

  return (
    <div className={`relative shrink-0 bg-gradient-to-b from-white via-white to-slate-50/50 px-4 pt-3 pb-4 sm:px-3 sm:pb-2.5 sm:pt-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.03)] ${containerClassName ?? ''}`}>
      {/* 渐变遮罩 */}
      <div className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-b from-white/0 via-white/80 to-white" />

      {topBanner}

      {/* 输入框容器 */}
      <div
        className={`relative z-10 rounded-[20px] sm:rounded-xl border transition-all duration-300 ${isOverLimit
          ? 'border-red-400 bg-red-50/30'
          : 'border-slate-200/80 bg-gradient-to-b from-white to-slate-50/30 focus-within:border-indigo-300/80 focus-within:shadow-[0_4px_20px_rgba(99,102,241,0.15),0_0_0_3px_rgba(99,102,241,0.08)] hover:border-indigo-200/60 hover:shadow-[0_4px_16px_rgba(99,102,241,0.1)]'
          } px-4 pt-3.5 pb-3 sm:px-3 sm:pt-2 sm:pb-1.5 shadow-[0_2px_12px_rgba(99,102,241,0.06),inset_0_1px_2px_rgba(255,255,255,0.8)]`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={window.innerWidth < 640 ? 1 : 3}
          className={`w-full resize-none bg-transparent px-1 py-0 outline-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none focus-visible:shadow-none [-webkit-tap-highlight-color:transparent] ${window.innerWidth < 640 ? 'text-[14px] leading-[1.6]' : 'text-[15px] leading-[1.75]'
            } text-slate-800 placeholder:text-slate-400 placeholder:font-light ${textareaClassName ?? ''}`}
          style={{ maxHeight: window.innerWidth < 640 ? 72 : 200 }}
        />

        {/* 底部操作栏 */}
        <div className="mt-1.5 flex h-auto min-h-0 w-full items-center justify-between gap-3 sm:mt-0.5 sm:gap-2" style={{ maxHeight: window.innerWidth < 400 ? 20 : 200 }}>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-1">
            {leftSlot}
          </div>

          {rightSlot ?? (
            <Tooltip title={sendTooltip}>
              <button
                type="button"
                disabled={Boolean(isSendDisabled || disabled)}
                onClick={handleSubmit}
                aria-label="发送消息"
                className={`inline-flex size-9 shrink-0 aspect-square self-center items-center justify-center rounded-full border-0 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:shadow-lg active:scale-95 sm:size-8 sm:aspect-square ${isSendDisabled || disabled
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400 shadow-none'
                  : 'bg-slate-950 text-white shadow-slate-950/20 hover:bg-slate-800 hover:shadow-slate-950/30'
                  }`}
              >
                {loading ? (
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <ArrowUp className="size-4" aria-hidden="true" />
                )}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}

/** 字数统计组件（桌面端显示） */
export function CharCounter({ current, max }: { current: number; max: number }) {
  const overLimit = current >= max
  return current > 0 ? (
    <span className={`text-xs tabular-nums max-md:hidden md:inline-block ${overLimit ? 'font-medium text-red-500' : 'text-slate-400'}`}>
      {current}/{max}
    </span>
  ) : null
}
