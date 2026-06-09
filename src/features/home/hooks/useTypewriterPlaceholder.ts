import { useEffect, useRef } from 'react'

/**
 * 打字机占位符 Hook（性能优化版）
 *
 * 原版问题：每 70ms 调用 setState 触发 React 重渲染，
 * 导致包含此 Hook 的大组件（如 HomePage）高频重渲染，
 * 进而阻塞用户交互（如侧边栏打开）的响应。
 *
 * 优化方案：使用 ref + 直接操作 DOM input/textarea 的 placeholder 属性，
 * 完全绕过 React 渲染管线，零重渲染开销。
 *
 * @param prompts 循环展示的提示文案数组
 * @param inputRef 目标 Input/TextArea 的 ref
 */
export function useTypewriterPlaceholder(
  prompts: readonly string[],
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef({
    promptIndex: 0,
    charIndex: 0,
    isDeleting: false,
  })

  useEffect(() => {
    if (prompts.length === 0 || !inputRef.current) return

    const el = inputRef.current
    const state = stateRef.current

    // 尊重系统"减少动态效果"设置
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      el.placeholder = prompts[0]
      return
    }

    const tick = () => {
      if (!el) return

      const prompt = prompts[state.promptIndex]
      const nextText = prompt.slice(0, state.charIndex)

      // 直接操作 DOM placeholder，不触发 React 重渲染
      el.placeholder = nextText

      if (!state.isDeleting && state.charIndex < prompt.length) {
        state.charIndex += 1
        timerRef.current = setTimeout(tick, 70)
        return
      }

      if (!state.isDeleting && state.charIndex === prompt.length) {
        state.isDeleting = true
        timerRef.current = setTimeout(tick, 1600)
        return
      }

      if (state.isDeleting && state.charIndex > 0) {
        state.charIndex -= 1
        timerRef.current = setTimeout(tick, 28)
        return
      }

      // 切换下一条
      state.isDeleting = false
      state.promptIndex = (state.promptIndex + 1) % prompts.length
      timerRef.current = setTimeout(tick, 360)
    }

    timerRef.current = setTimeout(tick, 300)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [prompts, inputRef])
}
