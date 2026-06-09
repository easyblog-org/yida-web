import { Button, Tooltip } from 'antd'
import { Crosshair } from 'lucide-react'
import { useState } from 'react'

import {
  buildVisualEditPrompt,
  parseVisualEditSource,
  type VisualEditElement,
} from '../utils/visualEdit'

import { CharCounter, SmartTextarea } from '@/components/SmartTextarea'

const composerActionButtonClassName =
  'h-8! rounded-full! border-0! px-3! text-sm! font-medium! shadow-none! [&_.ant-btn-icon]:inline-flex! [&_.ant-btn-icon]:items-center!'
const composerInactiveActionButtonClassName = `${composerActionButtonClassName} bg-white! text-slate-700! hover:bg-white! hover:text-slate-900!`
const composerActiveActionButtonClassName = `${composerActionButtonClassName} bg-slate-900! text-white! hover:bg-slate-800! hover:text-white!`

const MAX_PROMPT_LENGTH = 1000

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
    if (isSubmitting) return '当前任务完成后可继续输入'
    if (!isSubmitEnabled) return '当前状态暂不能生成或修改'
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
    if (isVisualEditMode) return '退出可视化编辑模式'
    if (isSubmitting) return '当前任务完成后可使用可视化编辑'
    if (!isVisualEditEnabled) return '预览加载后可使用可视化编辑'
    return '开启可视化编辑模式'
  })()

  const handleToggleVisualEditMode = () => {
    if (!isVisualEditMode && !canEnableVisualEdit) return
    onVisualEditModeChange?.(!isVisualEditMode)
  }

  const handleSubmit = (value: string) => {
    if (!value.trim()) return false
    if (isVisualEditMode && !selectedVisualEditElement) return false

    const submitPrompt =
      isVisualEditMode && selectedVisualEditElement
        ? buildVisualEditPrompt(value, selectedVisualEditElement)
        : value

    if (onSubmitMessage(submitPrompt)) {
      onVisualEditModeChange?.(false)
      return true
    }
    return false
  }

  const placeholderText = isVisualEditMode
    ? selectedVisualEditElement
      ? '描述这个元素要如何调整'
      : '先在右侧预览选择元素，再描述修改需求'
    : '描述想生成或调整的地方，可以一步一步完善生成效果'

  // 左侧插槽：编辑按钮 + 字数统计
  const leftSlot = (
    <>
      <Tooltip title={visualEditTooltipTitle}>
        <span className="max-md:hidden md:inline-flex">
          <Button
            htmlType="button"
            disabled={!isVisualEditMode && !canEnableVisualEdit}
            aria-pressed={isVisualEditMode}
            onClick={handleToggleVisualEditMode}
            icon={<Crosshair className="size-4" aria-hidden="true" />}
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
      <CharCounter current={prompt.length} max={MAX_PROMPT_LENGTH} />
    </>
  )

  // 顶部横幅：可视化编辑模式提示
  const topBanner = isVisualEditMode ? (
    <div className="relative z-10 mb-2.5 flex min-h-11 min-w-0 items-center gap-2.5 rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 to-purple-50/60 px-4 py-2 text-sm text-indigo-700 shadow-sm shadow-indigo-500/5 backdrop-blur-sm">
      <Crosshair className="size-4 shrink-0 text-indigo-500" aria-hidden="true" />
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
  ) : null

  return (
    <SmartTextarea
      value={prompt}
      onChange={setPrompt}
      onSubmit={handleSubmit}
      placeholder={placeholderText}
      disabled={isComposerDisabled}
      loading={isSubmitting}
      maxLength={MAX_PROMPT_LENGTH}
      sendTooltip={sendTooltipTitle}
      isSendDisabled={isSendDisabled}
      leftSlot={leftSlot}
      topBanner={topBanner}
    />
  )
}
