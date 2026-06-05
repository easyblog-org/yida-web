import { Think } from '@ant-design/x'
import { XMarkdown } from '@ant-design/x-markdown'
import { CheckCircle, CircleDashed, Wrench, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  parseAppConversationTranscript,
  type AppConversationTranscriptBlock,
} from '../utils/appConversationTranscript'

export function AppAssistantMessageContent({
  content,
  isGenerating,
}: {
  content: string
  isGenerating?: boolean
}) {
  const blocks = parseAppConversationTranscript(content)

  return (
    <div className="space-y-2 text-sm leading-6 text-slate-700">
      {blocks.map((block, index) => (
        <AppAssistantTranscriptBlock
          key={`${block.type}-${index}`}
          block={block}
          hasNextChunk={Boolean(isGenerating && index === blocks.length - 1)}
        />
      ))}
    </div>
  )
}

function AppAssistantTranscriptBlock({
  block,
  hasNextChunk,
}: {
  block: AppConversationTranscriptBlock
  hasNextChunk: boolean
}) {
  if (block.type === 'text') {
    return (
      <AppAssistantMarkdown
        content={block.content}
        hasNextChunk={hasNextChunk}
      />
    )
  }

  if (block.type === 'thinking') {
    const isThinking = hasNextChunk && block.streaming
    const [expanded, setExpanded] = useState(isThinking)
    useEffect(() => {
      if (!isThinking) {
        setExpanded(false)
      }
    }, [isThinking])
    return (
      <Think
        title="思考过程"
        expanded={isThinking || expanded}
        onExpand={setExpanded}
        loading={hasNextChunk && block.streaming}
      >
        <AppAssistantMarkdown
          content={block.content}
          hasNextChunk={hasNextChunk}
          className="x-markdown-light text-xs leading-5 text-slate-500"
        />
      </Think>
    )
  }

  if (block.type === 'tool-call') {
    const isStreaming = hasNextChunk && block.streaming
    const [expanded, setExpanded] = useState(isStreaming)
    useEffect(() => {
      if (!isStreaming) {
        setExpanded(false)
      }
    }, [isStreaming])
    return (
      <Think
        title={block.title || block.name || '工具调用'}
        icon={block.streaming ? <CircleDashed className="size-3.5 animate-spin" /> : <Wrench className="size-3.5" />}
        expanded={isStreaming || expanded}
        onExpand={setExpanded}
        loading={hasNextChunk && block.streaming}
      >
        <AppAssistantMarkdown
          content={block.content}
          hasNextChunk={hasNextChunk}
          className="x-markdown-light text-xs leading-5 text-slate-600"
        />
      </Think>
    )
  }

  const ResultIcon = block.success ? CheckCircle : XCircle
  const [resultExpanded, setResultExpanded] = useState(false)

  return (
    <Think
      title={block.title || block.name || '工具结果'}
      icon={<ResultIcon className="size-3.5" />}
      expanded={resultExpanded}
      onExpand={setResultExpanded}
    >
      <AppAssistantMarkdown
        content={block.content}
        hasNextChunk={hasNextChunk}
        className={`x-markdown-light text-xs leading-5 ${block.success ? 'text-emerald-700' : 'text-rose-700'}`}
      />
    </Think>
  )
}

function AppAssistantMarkdown({
  content,
  hasNextChunk,
  className = 'x-markdown-light text-sm leading-6',
}: {
  content: string
  hasNextChunk: boolean
  className?: string
}) {
  if (!content) {
    return null
  }

  return (
    <XMarkdown
      content={content}
      className={className}
      openLinksInNewTab
      escapeRawHtml
      streaming={hasNextChunk ? {
        hasNextChunk: true,
        enableAnimation: true,
        tail: { component: StreamingTail },
      } : undefined}
    />
  )
}

function StreamingTail() {
  return (
    <span className="inline-block ml-0.5 size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500 align-middle" />
  )
}
