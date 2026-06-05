export interface VisualEditElement {
  id: string
  source: string
  tag: string
  text: string
}

export interface VisualEditSourceLocation {
  filePath: string
  lineNumber?: number
  columnNumber?: number
}

export interface ParsedVisualEditPrompt {
  requirement: string
  element: VisualEditElement
  sourceLocation: VisualEditSourceLocation
}

const VISUAL_EDIT_BLOCK_PATTERN = /<yida-visual-edit>\s*([\s\S]*?)\s*<\/yida-visual-edit>/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getStringField(payload: Record<string, unknown>, key: string) {
  const value = payload[key]

  return typeof value === 'string' ? value.trim() : ''
}

export function parseVisualEditSource(source: string): VisualEditSourceLocation {
  const normalizedSource = source.trim()
  const match = normalizedSource.match(/^(.*):(\d+):(\d+)$/)

  if (!match) {
    return {
      filePath: normalizedSource,
    }
  }

  return {
    filePath: match[1],
    lineNumber: Number(match[2]),
    columnNumber: Number(match[3]),
  }
}

export function normalizeVisualEditElementPayload(payload: unknown): VisualEditElement | null {
  if (!isRecord(payload)) {
    return null
  }

  const id = getStringField(payload, 'id')
  const source = getStringField(payload, 'source')
  const tag = getStringField(payload, 'tag')
  const textValue = payload.text
  const text = typeof textValue === 'string' ? textValue.trim() : ''

  if (!id || !source || !tag) {
    return null
  }

  return {
    id,
    source,
    tag,
    text,
  }
}

export function buildVisualEditPrompt(requirement: string, element: VisualEditElement) {
  const sourceLocation = parseVisualEditSource(element.source)
  const visualEditPayload = {
    id: element.id,
    tag: element.tag,
    text: element.text,
    source: element.source,
    filePath: sourceLocation.filePath,
    lineNumber: sourceLocation.lineNumber,
    columnNumber: sourceLocation.columnNumber,
    sourceLocation,
  }

  // 这段协议块会被后端/Agent 读取；用户侧展示时会被解析成摘要。
  return `请对以下可视化选中的元素进行定向修改。

修改需求：
${requirement.trim()}

<yida-visual-edit>
${JSON.stringify(visualEditPayload, null, 2)}
</yida-visual-edit>`
}

export function parseVisualEditPrompt(content: string | undefined): ParsedVisualEditPrompt | null {
  if (!content) {
    return null
  }

  const blockMatch = content.match(VISUAL_EDIT_BLOCK_PATTERN)

  if (!blockMatch) {
    return null
  }

  try {
    const parsedPayload = JSON.parse(blockMatch[1]) as unknown
    const element = normalizeVisualEditElementPayload(parsedPayload)

    if (!element) {
      return null
    }

    const requirement = content
      .slice(0, blockMatch.index)
      .replace(/^请对以下可视化选中的元素进行定向修改。\s*/u, '')
      .replace(/^修改需求：\s*/u, '')
      .trim()

    return {
      requirement,
      element,
      sourceLocation: parseVisualEditSource(element.source),
    }
  } catch {
    return null
  }
}

export function formatVisualEditElementLabel(element: VisualEditElement) {
  const sourceLocation = parseVisualEditSource(element.source)
  const lineText = sourceLocation.lineNumber ? `:${sourceLocation.lineNumber}` : ''

  // 选中元素文本可能包含大量换行，展示标签只保留源码定位。
  return `<${element.tag}> ${sourceLocation.filePath}${lineText}`
}

export function formatVisualEditPromptForDisplay(content: string) {
  const parsedPrompt = parseVisualEditPrompt(content)

  if (!parsedPrompt) {
    return content
  }

  return `请对以下选中元素进行修改：

修改需求：${parsedPrompt.requirement || '未填写具体修改需求'}

选中元素：${formatVisualEditElementLabel(parsedPrompt.element)}`
}
