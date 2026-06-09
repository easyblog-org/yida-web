import { useCallback, useEffect, useRef, useState } from 'react'

interface SlideDrawerProps {
  /** 控制抽屉开关 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 抽屉方向，默认 right */
  placement?: 'left' | 'right'
  /** 抽屉宽度，默认 280px */
  width?: string | number
  /** 遮罩层透明度，默认 bg-black/40 */
  maskOpacity?: string
  /** 动画时长（ms），默认 300 */
  duration?: number
  /** 额外类名 */
  className?: string
  /** 遮罩层额外类名 */
  maskClassName?: string
  /** 关闭动画结束后是否卸载 DOM，默认 false（保留以避免重复挂载卡顿） */
  destroyOnHidden?: boolean
  children: React.ReactNode
}

const DEBUG = true

function log(tag: string, msg: string, data?: unknown) {
  if (!DEBUG) return
  const ts = performance.now().toFixed(1)
  console.log(`[SlideDrawer ${ts}ms] [${tag}] ${msg}`, data ?? '')
}

/**
 * 可复用的侧滑抽屉组件（纯 div + TailwindCSS）
 *
 * 状态机：
 *   idle    → opening → open → closing → idle
 *   (隐藏)            (滑入)  (静止)  (滑出)
 */
export function SlideDrawer({
  open,
  onClose,
  placement = 'right',
  width = 280,
  maskOpacity = 'bg-black/40',
  duration = 300,
  className,
  maskClassName,
  destroyOnHidden = false,
  children,
}: SlideDrawerProps) {
  // ── 状态机 ──
  const [phase, setPhase] = useState<'idle' | 'opening' | 'open' | 'closing'>(
    open ? 'opening' : 'idle',
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const prevOpenRef = useRef(open)
  const renderCountRef = useRef(0)

  renderCountRef.current += 1
  log('render', `#${renderCountRef.current} phase=${phase} open=${open}`, {
    destroyOnHidden,
    placement,
    width,
  })

  // ── 清理所有异步任务 ──
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      log('cleanup', 'cleared timer')
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      log('cleanup', 'cleared rAF')
    }
  }, [])

  // ── open 变化驱动状态机 ──
  useEffect(() => {
    if (open === prevOpenRef.current) return
    const prevOpen = prevOpenRef.current
    prevOpenRef.current = open

    log('open-change', `${prevOpen} → ${open}, current phase=${phase}`)
    performance.mark(`slide-drawer-open-${Date.now()}`)

    clearAllTimers()

    if (open) {
      const t0 = performance.now()
      log('action', 'setPhase(opening)')
      setPhase('opening')

      // ═══ 双重 rAF ═══
      // rAF#1: 在下一个浏览器重绘之前调用
      // rAF#2: 在 rAF#1 对应的重绘完成之后才调用
      // 这确保浏览器先画一帧"面板在屏幕外"，再切换到"面板在目标位置"
      const raf1Id = requestAnimationFrame(() => {
        const dt1 = (performance.now() - t0).toFixed(1)
        log('rAF#1', `fired after ${dt1}ms (before paint)`)

        const raf2Id = requestAnimationFrame(() => {
          const dt2 = (performance.now() - t0).toFixed(1)
          log('rAF#2', `fired after ${dt2}ms (after paint), setPhase(open)`)
          rafRef.current = null
          setPhase('open')
        })
        rafRef.current = raf2Id
      })
      rafRef.current = raf1Id
    } else {
      log('action', 'setPhase(closing), will call onClose after', `${duration}ms`)
      setPhase('closing')

      const endMark = `slide-drawer-close-end-${Date.now()}`
      timerRef.current = setTimeout(() => {
        log('timer', 'closing timer fired, setPhase(idle) + calling onClose()')
        performance.mark(endMark)
        try {
          performance.measure(
            'slide-drawer-close-anim',
            `slide-drawer-open-${prevOpen ? 'true' : 'false'}`,
            endMark,
          )
          const m = performance.getEntriesByName('slide-drawer-close-anim').pop()
          if (m) log('perf', `close animation total ${(m.duration).toFixed(1)}ms`)
        } catch {
          // ignore measure errors
        }
        setPhase('idle')
        onClose?.()
      }, duration)
    }
  }, [open, duration, onClose, clearAllTimers])

  // ── phase 变化日志 & 性能测量 ──
  useEffect(() => {
    log('phase', `changed to "${phase}"`, {
      timestamp: Date.now(),
      now: performance.now().toFixed(1),
    })

    const markName = `slide-drawer-phase-${phase}-${Date.now()}`
    performance.mark(markName)

    if (phase === 'opening') {
      // opening 阶段标记，用于测量 opening→open 耗时
    } else if (phase === 'open') {
      try {
        const entries = performance.getEntriesByType('mark')
        const openingMarks = entries.filter((e) =>
          e.name.startsWith('slide-drawer-phase-opening-'),
        )
        if (openingMarks.length > 0) {
          const lastOpening = openingMarks[openingMarks.length - 1]
          performance.measure('slide-drawer-opening→open', lastOpening.name, markName)
          const m = performance.getEntriesByName('slide-drawer-opening→open').pop()
          if (m) log('perf', `opening→open 耗时 ${(m.duration).toFixed(1)}ms`)
        }
      } catch {
        // ignore
      }
    } else if (phase === 'closing') {
      // closing 标记
    } else if (phase === 'idle') {
      try {
        const entries = performance.getEntriesByType('mark')
        const closingMarks = entries.filter((e) =>
          e.name.startsWith('slide-drawer-phase-closing-'),
        )
        if (closingMarks.length > 0) {
          const lastClosing = closingMarks[closingMarks.length - 1]
          performance.measure('slide-drawer-closing→idle', lastClosing.name, markName)
          const m = performance.getEntriesByName('slide-drawer-closing→idle').pop()
          if (m) log('perf', `closing→idle 耗时 ${(m.duration).toFixed(1)}ms`)
        }
      } catch {
        // ignore
      }
    }
  }, [phase])

  // ── 卸载清理 ──
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [clearAllTimers])

  // ── body scroll lock / ESC 关闭 ──
  // 仅在非 idle 阶段锁定滚动，用 ref 追踪避免重复设置
  const scrollLockedRef = useRef(false)
  useEffect(() => {
    if (phase === 'idle') {
      if (scrollLockedRef.current) {
        log('scroll-unlock', 'restoring overflow (phase=idle)')
        document.body.style.overflow = ''
        scrollLockedRef.current = false
      }
      return
    }

    if (scrollLockedRef.current) return // 已锁定，跳过

    const t0 = performance.now()
    log('scroll-lock', 'locking body overflow')

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    scrollLockedRef.current = true

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'closing') {
        log('esc', 'Escape pressed, triggering close')
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      const dt = (performance.now() - t0).toFixed(1)
      log('scroll-unlock', `cleanup restoring overflow after ${dt}ms`)
      document.body.style.overflow = prevOverflow
      scrollLockedRef.current = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    log('close-click', `handleClose called, phase=${phase}`)
    if (phase === 'opening' || phase === 'open') {
      clearAllTimers()
      log('close-action', 'setPhase(closing)')
      setPhase('closing')
      timerRef.current = setTimeout(() => {
        log('close-timer', 'timer fired → idle + onClose')
        setPhase('idle')
        onClose?.()
      }, duration)
    } else {
      log('close-ignore', `ignored, phase=${phase} is not openable`)
    }
  }, [phase, duration, onClose, clearAllTimers])

  // ── 完全空闲时决定是否卸载 DOM ──
  if (phase === 'idle' && destroyOnHidden) {
    log('unmount', 'return null — DOM will be unmounted')
    return null
  }

  const isRight = placement === 'right'
  const widthVal = typeof width === 'number' ? `${width}px` : width
  const isVisible = phase !== 'idle'

  // transform 值：GPU 加速的 translate3d
  const slideOutX = isRight ? widthVal : `-${widthVal}`

  // 各阶段样式：
  // opening: 屏幕外 + 透明（确保即使提前显示也看不到闪烁）
  // open:    正确位置 + 不透明
  // closing: 屏幕外 + 透明（滑出+淡出）
  // idle:    屏幕外 + 透明（但 visibility:hidden 完全隐藏）
  let panelTransform: string
  let panelOpacity: number
  switch (phase) {
    case 'opening':
      panelTransform = `translate3d(${slideOutX}, 0, 0)`
      panelOpacity = 0
      break
    case 'open':
      panelTransform = 'translate3d(0, 0, 0)'
      panelOpacity = 1
      break
    case 'closing':
      panelTransform = `translate3d(${slideOutX}, 0, 0)`
      panelOpacity = 0
      break
    default:
      panelTransform = `translate3d(${slideOutX}, 0, 0)`
      panelOpacity = 0
      break
  }

  const maskOpacityVal = phase === 'open' ? 1 : 0

  // 共享过渡样式
  const transitionStyle: React.CSSProperties = {
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
  }

  // 动画期间移除阴影，结束后恢复（避免 paint）
  const hasShadow = phase === 'open'

  return (
    <div
      className={`fixed inset-0 z-[1000] ${className ?? ''}`}
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {/* 遮罩层 */}
      <div
        className={`absolute inset-0 ${maskOpacity} ${maskClassName ?? ''}`}
        style={{
          opacity: maskOpacityVal,
          ...transitionStyle,
          transitionProperty: 'opacity',
        }}
        onClick={handleClose}
      />

      {/* 抽屉面板 */}
      <div
        className={`absolute ${isRight ? 'right-0' : 'left-0'} top-0 flex h-full flex-col bg-white ${hasShadow ? 'shadow-xl' : ''
          }`}
        style={{
          width: widthVal,
          transform: panelTransform,
          opacity: panelOpacity,
          willChange: isVisible ? 'transform,opacity' : 'auto',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          ...transitionStyle,
          transitionProperty: 'transform,opacity',
        }}
      >
        {children}
      </div>
    </div>
  )
}
