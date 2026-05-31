import { Sender } from '@ant-design/x'
import { Button, Tooltip } from 'antd'
import { ArrowUp, Crosshair } from 'lucide-react'
import { useState } from 'react'

import {
  buildVisualEditPrompt,
  parseVisualEditSource,
  type VisualEditElement,
} from '../utils/visualEdit'

const composerActionButtonClassName =
  'h-8! rounded-full! border-0! px-3! text-sm! font-medium! shadow-none! [&_.ant-btn-icon]:inline-flex! [&_.ant-btn-icon]:items-center!'
const composerInactiveActionButtonClassName = `${composerActionButtonClassName} bg-white! text-slate-700! hover:bg-white! hover:text-slate-900!`
const composerActiveActionButtonClassName = `${composerActionButtonClassName} bg-slate-900! text-white! hover:bg-slate-800! hover:text-white!`

export function AppConversationComposer({
  isSubmitEnabled,
  isSubmitting,
  isVisualEditEnabled,
  isVisualEditMode,
  selectedVisualEditElement,
  onVisualEditModeChange,
  onSubmitMessage,
}: {
  isSubmitEnabled?: boolean
  isSubmitting?: boolean
  isVisualEditEnabled?: boolean
  isVisualEditMode?: boolean
  selectedVisualEditElement?: VisualEditElement | null
  onVisualEditModeChange?: (enabled: boolean) => void
  onSubmitMessage: (prompt: string) => boolean
}) {
  const [prompt, setPrompt] = useState('')

  const isComposerDisabled = Boolean(isSubmitting || !isSubmitEnabled)
  const isPromptEmpty = prompt.trim().length === 0
  const isVisualEditSubmitBlocked = Boolean(isVisualEditMode && !selectedVisualEditElement)
  const isSendDisabled = Boolean(isComposerDisabled || isPromptEmpty || isVisualEditSubmitBlocked)
  const canEnableVisualEdit = Boolean(isVisualEditEnabled && !isSubmitting)
  const selectedVisualEditSourceLocation = selectedVisualEditElement
    ? parseVisualEditSource(selectedVisualEditElement.source)
    : null
  const selectedVisualEditLineText = selectedVisualEditSourceLocation?.lineNumber
    ? `:${selectedVisualEditSourceLocation.lineNumber}`
    : ''
  const disabledReason = (() => {
    if (isSubmitting) {
      return '当前任务完成后可继续输入'
    }

    if (!isSubmitEnabled) {
      return '当前状态暂不能生成或修改'
    }

    return undefined
  })()
  const sendTooltipTitle =
    disabledReason ??
    (isVisualEditSubmitBlocked
      ? '请先在预览中选择要编辑的元素'
      : isPromptEmpty
        ? '请输入内容后发送'
        : undefined)
  const visualEditTooltipTitle = (() => {
    if (isVisualEditMode) {
      return '退出可视化编辑模式'
    }

    if (isSubmitting) {
      return '当前任务完成后可使用可视化编辑'
    }

    if (!isVisualEditEnabled) {
      return '预览加载后可使用可视化编辑'
    }

    return '开启可视化编辑模式'
  })()
  const handleToggleVisualEditMode = () => {
    if (!isVisualEditMode && !canEnableVisualEdit) {
      return
    }

    onVisualEditModeChange?.(!isVisualEditMode)
  }

  const handleSubmit = (value: string) => {
    const nextPrompt = value.trim()

    if (!nextPrompt) {
      return
    }

    if (isVisualEditMode && !selectedVisualEditElement) {
      return
    }

    const submitPrompt =
      isVisualEditMode && selectedVisualEditElement
        ? buildVisualEditPrompt(nextPrompt, selectedVisualEditElement)
        : nextPrompt

    if (onSubmitMessage(submitPrompt)) {
      setPrompt('')
      onVisualEditModeChange?.(false)
    }
  }

  return (
    <div className="relative shrink-0 bg-gradient-to-b from-white via-white to-slate-50/50 px-4 pt-3 pb-4 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
      <div className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-b from-white/0 via-white/80 to-white" />
      {isVisualEditMode && (
        <div className="relative z-10 mb-2.5 flex min-h-11 min-w-0 items-center gap-2.5 rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 to-purple-50/60 px-4 py-2 text-sm text-indigo-700 shadow-sm shadow-indigo-500/5 backdrop-blur-sm">
          <Crosshair
            className="size-4 shrink-0 text-indigo-500"
            aria-hidden="true"
          />
          {selectedVisualEditElement && selectedVisualEditSourceLocation ? (
            <>
              <span className="shrink-0 font-medium text-indigo-600">已选中元素</span>
              <span className="shrink-0 rounded-md border border-indigo-200/60 bg-white/90 px-2 py-1 font-mono text-xs leading-4 text-indigo-700 shadow-sm">
                {`<${selectedVisualEditElement.tag}>`}
              </span>
              <span className="ml-auto min-w-0 truncate font-mono text-sm text-indigo-500/70">
                {selectedVisualEditSourceLocation.filePath}
                {selectedVisualEditLineText}
              </span>
            </>
          ) : (
            <span className="min-w-0 truncate text-indigo-600/80">等待选择预览元素</span>
          )}
        </div>
      )}
      <Sender
        value={prompt}
        onChange={(v) => setPrompt(v)}
        onSubmit={handleSubmit}
        disabled={isComposerDisabled}
        loading={isSubmitting}
        autoSize={{ minRows: 1, maxRows: 6 }}
        placeholder={
          isVisualEditMode
            ? selectedVisualEditElement
              ? '描述这个元素要如何调整'
              : '先在右侧预览选择元素，再描述修改需求'
            : '描述想生成或调整的地方，可以一步一步完善生成效果'
        }
        className="relative z-10 rounded-[20px]! border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/30 px-4 pt-3.5 pb-3 shadow-[0_2px_12px_rgba(99,102,241,0.06),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-300 hover:border-indigo-200/60 hover:shadow-[0_4px_16px_rgba(99,102,241,0.1),inset_0_1px_2px_rgba(255,255,255,0.9)] focus-within:border-indigo-300/80 focus-within:shadow-[0_4px_20px_rgba(99,102,241,0.15),0_0_0_3px_rgba(99,102,241,0.08)]"
        classNames={{
          content: 'items-start!',
          input:
            'min-h-10! bg-transparent! px-1! py-0! text-[15px]! leading-[1.75]! text-slate-800! placeholder:text-slate-400! placeholder:font-light!',
          footer: 'mt-2.5!',
        }}
        suffix={false}
        footer={
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Tooltip title={visualEditTooltipTitle}>
                <span className="inline-flex">
                  <Button
                    htmlType="button"
                    disabled={!isVisualEditMode && !canEnableVisualEdit}
                    aria-pressed={isVisualEditMode}
                    onClick={handleToggleVisualEditMode}
                    icon={
                      <Crosshair
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                    className={
                      isVisualEditMode
                        ? composerActiveActionButtonClassName
                        : composerInactiveActionButtonClassName
                    }
                  >
                    编辑
                  </Button>
                </span>
              </Tooltip>
            </div>
            <Tooltip title={sendTooltipTitle}>
              <span className="inline-flex">
                <Button
                  htmlType="button"
                  type="primary"
                  shape="circle"
                  loading={isSubmitting}
                  disabled={isSendDisabled}
                  onClick={() => handleSubmit(prompt)}
                  aria-label="发送消息"
                  icon={
                    <ArrowUp
                      className="size-4"
                      aria-hidden="true"
                    />
                  }
                  className="size-9! shrink-0! rounded-full! border-0! bg-gradient-to-br from-indigo-500 to-purple-600! text-white! shadow-md shadow-indigo-500/25! transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30! active:scale-95 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none!"
                />
              </span>
            </Tooltip>
          </div>
        }
      />
    </div>
  )
}
