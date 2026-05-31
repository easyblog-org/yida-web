export type AppConversationTranscriptBlock =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string; streaming?: boolean }
  | {
    type: 'tool-call'
    name: string
    title: string
    content: string
    streaming?: boolean
  }
  | {
    type: 'tool-result'
    name: string
    title: string
    success: boolean
    content: string
    streaming?: boolean
  }

type TranscriptTagName = 'thinking' | 'tool-call' | 'tool-result'

const transcriptTagPattern = /<\/?yida-(thinking|tool-call|tool-result)\b[^>]*>/g

function stripTrailingPartialTranscriptTag(content: string) {
  return content.replace(/<\/?yida-[a-z-]*(?:\s[^<>]*)?$/i, '').replace(/<\/?$/, '')
}

function parseTranscriptAttributes(rawTag: string) {
  const attributes: Record<string, string> = {}
  const attributePattern = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g

  for (const match of rawTag.matchAll(attributePattern)) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attributes
}

function createTranscriptBlock({
  tagName,
  rawTag,
  content,
  streaming,
}: {
  tagName: TranscriptTagName
  rawTag: string
  content: string
  streaming?: boolean
}): AppConversationTranscriptBlock {
  if (tagName === 'thinking') {
    return {
      type: 'thinking',
      content,
      ...(streaming ? { streaming } : {}),
    }
  }

  const attributes = parseTranscriptAttributes(rawTag)
  const name = attributes.name ?? ''
  const title = attributes.title || name

  if (tagName === 'tool-call') {
    return {
      type: 'tool-call',
      name,
      title,
      content,
      ...(streaming ? { streaming } : {}),
    }
  }

  return {
    type: 'tool-result',
    name,
    title,
    success: attributes.success === 'true',
    content,
    ...(streaming ? { streaming } : {}),
  }
}

export function parseAppConversationTranscript(content: string): AppConversationTranscriptBlock[] {
  const blocks: AppConversationTranscriptBlock[] = []
  let cursor = 0

  while (cursor < content.length) {
    transcriptTagPattern.lastIndex = cursor
    const tagMatch = transcriptTagPattern.exec(content)

    if (!tagMatch) {
      const textContent = stripTrailingPartialTranscriptTag(content.slice(cursor))

      if (textContent) {
        blocks.push({ type: 'text', content: textContent })
      }

      break
    }

    const rawTag = tagMatch[0]
    const tagName = tagMatch[1] as TranscriptTagName

    if (tagMatch.index > cursor) {
      blocks.push({ type: 'text', content: content.slice(cursor, tagMatch.index) })
    }

    if (rawTag.startsWith('</')) {
      cursor = tagMatch.index + rawTag.length
      continue
    }

    const bodyStart = tagMatch.index + rawTag.length
    const closeTag = `</yida-${tagName}>`
    const closeIndex = content.indexOf(closeTag, bodyStart)

    // 流式过程中闭合标签可能还没到达，先把当前块标记为 streaming。
    if (closeIndex === -1) {
      blocks.push(
        createTranscriptBlock({
          tagName,
          rawTag,
          content: stripTrailingPartialTranscriptTag(content.slice(bodyStart)),
          streaming: true,
        }),
      )
      break
    }

    blocks.push(
      createTranscriptBlock({
        tagName,
        rawTag,
        content: content.slice(bodyStart, closeIndex),
      }),
    )
    cursor = closeIndex + closeTag.length
  }

  return blocks
}
