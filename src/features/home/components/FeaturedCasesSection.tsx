import { useListCases } from '@/api/generated/endpoints/case'
import type { AppVO, PageResultAppVO } from '@/api/generated/models'
import emptyAppCover from '@/assets/empty-app-cover.svg'
import { Link } from '@tanstack/react-router'
import { Skeleton } from 'antd'
import { ArrowRight, BookOpen, ChevronDown, LayoutGrid, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  openPublicCaseDetailInNewTab,
} from '@/features/cases-square/utils/publicCase'

/* ──────── 常量 ───────── */
const PAGE_SIZE = 12           // 每页加载条数（首屏 & 分页一致）
const ALLOWED_DUPLICATE_COUNT = 2 // 去重允许容差

/** 分类筛选标签 */
const CATEGORY_TABS = [
  { label: '全部', value: 'all' },
  { label: '工具', value: 'tool' },
  { label: '数据分析', value: 'analytics' },
  { label: '活动页面', value: 'campaign' },
  { label: '管理平台', value: 'admin' },
  { label: '用户应用', value: 'user-app' },
  { label: '个人管理', value: 'personal' },
  { label: '游戏', value: 'game' },
] as const

type CategoryValue = (typeof CATEGORY_TABS)[number]['value']

/* ───────── 工具函数 ──────── */

/** 返回每页加载条数 */
function getPageSize(_pageNum: number) {
  return PAGE_SIZE
}

/** 格式化日期为 YYYY-MM-DD */
function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

/* ───────── 排序下拉菜单 ───────── */

function SortDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const options = [
    { label: '默认排序', value: 'default' },
    { label: '最新发布', value: 'newest' },
    { label: '最多浏览', value: 'popular' },
  ]
  const currentLabel = options.find((o) => o.value === value)?.label ?? '默认排序'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
      >
        {currentLabel}
        <ChevronDown className="size-3.5 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${opt.value === value ? 'font-medium text-indigo-600' : 'text-slate-600'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ───────── 主组件 ───────── */

export function FeaturedCasesSection() {

  // ── 分页 / 数据状态 ──
  const [activeCategory, setActiveCategory] = useState<CategoryValue>('all')
  const [sortBy, setSortBy] = useState('default')
  const [pageNum, setPageNum] = useState(1)

  const [allCases, setAllCases] = useState<AppVO[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [initialLoadingDone, setInitialLoadingDone] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // ─ 根据分类标签生成搜索关键词（"全部"时不传 keyword） ──
  const searchKeyword = activeCategory === 'all'
    ? undefined
    : CATEGORY_TABS.find((t) => t.value === activeCategory)?.label

  // ── Refs ──
  const sectionRef = useRef<HTMLElement>(null)
  const isLoadingMoreRef = useRef(false)
  const prevCountRef = useRef(0)

  // ── React Query 查询（pageNum / searchKeyword 变化时自动重新请求） ──
  const query = useListCases<PageResultAppVO | undefined, { message?: string }>(
    {
      request: {
        pageNum,
        pageSize: getPageSize(pageNum),
        featuredOnly: true,
        keyword: searchKeyword,
      },
    },
    {
      query: {
        retry: false,
        select: (response) => response.data,
      },
    },
  )

  // ── 数据到达时处理（pageNum === 1 覆盖 / 否则追加） ──
  // 注意：未使用 keepPreviousData，query key 变化时 query.data 自动变为 undefined，
  // 因此无需额外的陈旧数据守卫，effect 只在当前查询的数据到达时触发
  useEffect(() => {
    const data = query.data
    if (!data?.list) return

    const newItems = data.list

    if (pageNum === 1) {
      // 首屏数据：直接覆盖
      setAllCases(newItems)
      prevCountRef.current = newItems.length
    } else {
      // 分页追加：去重后追加到已有列表
      setAllCases((prev) => {
        const existingIds = new Set(prev.map((c) => c.id).filter(Boolean))
        const uniqueNew = newItems.filter((c) => c.id && !existingIds.has(c.id))

        // 当去重后数量差异过大时，回退到使用全量数据（防止服务端重复返回旧数据导致丢数据）
        if (
          uniqueNew.length < newItems.length - ALLOWED_DUPLICATE_COUNT &&
          newItems.length > 0
        ) {
          return [...prev, ...newItems]
        }

        return [...prev, ...uniqueNew]
      })
      prevCountRef.current = allCases.length
    }

    setHasMore(data.hasNext ?? false)
    setIsLoadingMore(false)
    isLoadingMoreRef.current = false
    setInitialLoadingDone(true)
  }, [query.data, pageNum])

  // ── 加载更多（分页） ──
  const handleLoadMore = () => {
    if (isLoadingMoreRef.current || !hasMore || query.isFetching) return
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    setPageNum((prev) => prev + 1)
  }

  // ── 切换分类标签（重置分页、清空数据、重新加载） ──
  const handleCategoryChange = (value: CategoryValue) => {
    if (value === activeCategory) return
    setActiveCategory(value)
    setPageNum(1)
    setAllCases([])
    setHasMore(true)
    setIsLoadingMore(false)
    setInitialLoadingDone(false)
    prevCountRef.current = 0

    // 切换筛选时触发过渡动画
    setIsTransitioning(true)

    // 移动端点击筛选标签后，自动将案例广场区域滚动到页面顶部（考虑固定导航栏高度）
    if (sectionRef.current && window.innerWidth < 768) {
      const navHeight = 56
      const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - navHeight
      window.scrollTo({ behavior: 'smooth', top })
    }
  }

  // 数据加载完成后关闭过渡动画（带短暂延迟让淡入效果可见）
  useEffect(() => {
    if (isTransitioning && initialLoadingDone) {
      const timer = setTimeout(() => setIsTransitioning(false), 50)
      return () => clearTimeout(timer)
    }
  }, [isTransitioning, initialLoadingDone])

  // ── 判断卡片是否做淡入动画（所有卡片都做，DOM 复用不会重复播放） ──
  const shouldAnimate = (_index: number) => true

  /* ───────── 骨架屏 ──────── */
  const renderSkeleton = () => (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-5 sm:grid-cols-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
          <Skeleton.Node active className="max-md:aspect-[9/16] aspect-video! w-full! rounded-none!" />
          <div className="space-y-2.5 p-4">
            <Skeleton.Node active className="h-4! w-3/5! rounded-md!" />
            <Skeleton.Node active className="h-3.5! w-2/5! rounded-md!" />
          </div>
        </div>
      ))}
    </div>
  )

  /* ───────── 初始加载 ───────── */
  if (query.isLoading && !initialLoadingDone) {
    return (
      <section
        ref={sectionRef}
        className="relative z-10 w-full mt-4"
        style={{ marginLeft: 'calc(-50vw + 50%)', width: '100vw' }}
      >
        <div className="overflow-hidden rounded-none rounded-t-3xl border-y-0 border-slate-200/60 bg-transparent shadow-none max-md:bg-white/50 max-md:backdrop-blur-sm sm:rounded-3xl sm:border sm:bg-white sm:shadow-sm">
          <div className="px-3 py-4 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">案例广场</h2>
                <p className="mt-1.5 text-sm text-slate-400">看看这些案例，获得一点创建应用的灵感</p>
              </div>
            </div>
            <div className="mt-6">{renderSkeleton()}</div>
          </div>
        </div>
      </section>
    )
  }

  /* ───────── 错误状态（展示空页面） ───────── */
  if (query.isError && allCases.length === 0) {
    const isEmpty = true

    return (
      <section
        ref={sectionRef}
        className="relative z-10 mb-2 min-h-[60vh] sm:min-h-[100vh]"
        style={{ marginLeft: 'calc(-50vw + 50%)', width: '100vw' }}
      >
        <div className="overflow-hidden rounded-none rounded-t-3xl border-y-0 border-slate-200/60 bg-transparent shadow-none max-md:bg-white/50 max-md:backdrop-blur-sm sm:rounded-3xl sm:border sm:bg-white sm:shadow-sm">
          <div className="px-3 py-4 sm:px-6 sm:py-6">

            {/* ─ 标题行 ── */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">案例广场</h2>
              <Link
                to="/cases"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600"
              >
                <LayoutGrid className="size-3.5" aria-hidden="true" />
                全部案例
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            {/* ── 工具栏：排序 + 分类标签 ── */}
            <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SortDropdown value={sortBy} onChange={setSortBy} />

              {/* 分类标签滚动容器 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleCategoryChange(tab.value)}
                    className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${activeCategory === tab.value
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {isEmpty && (
              /* ── 空状态 ─ */
              <div className={`mt-16 flex flex-col items-center justify-center text-center transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                <div className="relative">
                  <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect x="20" y="36" width="80" height="52" rx="4" stroke="#CBD5E1" strokeWidth="2" fill="#F8FAFC" />
                    <path d="M24 40H56V84H24C21.7909 84 20 82.2091 20 80V44C20 41.7909 21.7909 40 24 40Z" fill="url(#boxGrad)" rx="2" />
                    <path d="M20 36L60 56L100 36L60 16L20 36Z" stroke="#CBD5E1" strokeWidth="2" fill="#F8FAFC" />
                    <path d="M20 36L60 56V48L20 28V36Z" fill="#E2E8F0" />
                    <rect x="68" y="54" width="12" height="10" rx="2" fill="#93C5FD" />
                    <line x1="68" y1="72" x2="92" y2="72" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                    <line x1="68" y1="78" x2="84" y2="78" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="88" cy="22" r="8" fill="#FEF3C7" />
                    <path d="M88 18V26M84 22H92" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M44 18L45.5 21L49 22L46 24.5L46.5 28L43 26L39.5 28L40 24.5L37 22L40.5 21Z" fill="#EC4899" />
                    <defs>
                      <linearGradient id="boxGrad" x1="20" y1="40" x2="56" y2="84" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#6366F1" />
                        <stop offset="1" stopColor="#4338CA" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <p className="mt-6 text-base text-slate-500">
                  案例加载失败，
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="font-medium text-indigo-500 hover:text-indigo-600 hover:underline"
                  >
                    点击重试
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  /* ───────── 正常渲染（含空状态） ───────── */
  const isEmpty = initialLoadingDone && allCases.length === 0

  return (
    <section
      ref={sectionRef}
      className="relative z-10 mb-2 min-h-[75vh] px-0 sm:px-8"
      style={{ marginLeft: 'calc(-50vw + 50%)', width: '100vw' }}
    >
      {/* ====== 白色容器（移动端无边框无圆角，卡片直接铺满） ====== */}
      <div className="overflow-hidden rounded-none border-y-0 border-slate-200/60 bg-transparent shadow-none max-md:bg-white/50 max-md:backdrop-blur-sm sm:rounded-3xl sm:border sm:bg-white sm:shadow-sm">
        <div className="px-3 py-4 sm:px-6 sm:py-6 min-h-[70vh]">

          {/* ─ 标题行 ── */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">案例广场</h2>
            <Link
              to="/cases"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600"
            >
              <LayoutGrid className="size-3.5" aria-hidden="true" />
              全部案例
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* ── 工具栏：排序 + 分类标签 ── */}
          <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SortDropdown value={sortBy} onChange={setSortBy} />

            {/* 分类标签滚动容器（秒哒风格：隐藏滚动条 + 方块标签） */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleCategoryChange(tab.value)}
                  className={`shrink-0 cursor-pointer rounded-lg px-3 py-[5px] text-sm font-medium transition-all duration-200 active:scale-[0.96] ${activeCategory === tab.value
                    ? 'bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-200'
                    : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200/60 hover:text-slate-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isEmpty ? (
            /* ── 空状态（保留标签栏可见） ── */
            <div className="mt-16 flex flex-col items-center justify-center text-center">
              {/* 盒子插图 */}
              <div className="relative">
                <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  {/* 箱子主体 */}
                  <rect x="20" y="36" width="80" height="52" rx="4" stroke="#CBD5E1" strokeWidth="2" fill="#F8FAFC" />
                  {/* 箱子左半（蓝色填充） */}
                  <path d="M24 40H56V84H24C21.7909 84 20 82.2091 20 80V44C20 41.7909 21.7909 40 24 40Z" fill="url(#boxGrad)" rx="2" />
                  {/* 箱盖左 */}
                  <path d="M20 36L60 56L100 36L60 16L20 36Z" stroke="#CBD5E1" strokeWidth="2" fill="#F8FAFC" />
                  {/* 箱盖左半 */}
                  <path d="M20 36L60 56V48L20 28V36Z" fill="#E2E8F0" />
                  {/* 小方块装饰 */}
                  <rect x="68" y="54" width="12" height="10" rx="2" fill="#93C5FD" />
                  <line x1="68" y1="72" x2="92" y2="72" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                  <line x1="68" y1="78" x2="84" y2="78" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                  {/* 十字 / 加号 */}
                  <circle cx="88" cy="22" r="8" fill="#FEF3C7" />
                  <path d="M88 18V26M84 22H92" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                  {/* 闪亮星 */}
                  <path d="M44 18L45.5 21L49 22L46 24.5L46.5 28L43 26L39.5 28L40 24.5L37 22L40.5 21Z" fill="#EC4899" />
                  <defs>
                    <linearGradient id="boxGrad" x1="20" y1="40" x2="56" y2="84" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#6366F1" />
                      <stop offset="1" stopColor="#4338CA" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <p className="mt-6 text-base text-slate-500">
                暂无该分类下的案例，
                <Link to="/cases" className="font-medium text-indigo-500 hover:text-indigo-600 hover:underline">
                  查看全部案例
                </Link>
              </p>
            </div>
          ) : (
            <>
              {/* ── 卡片网格（移动端接近铺满，小间距） ── */}
              <div className={`mt-6 grid grid-cols-2 gap-2.5 sm:gap-5 sm:grid-cols-3 lg:grid-cols-3 transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                {allCases.map((app, index) => {
                  const title = app.name?.trim() || '未命名应用'
                  const authorName = app.author?.nickname?.trim() || '未知作者'
                  const createdAt = formatDate(app.publishedAt ?? app.createdAt)
                  const coverUrl = app.coverUrl || emptyAppCover
                  const featured = Boolean(app.featured)
                  const animate = shouldAnimate(index)

                  return (
                    <article
                      key={app.id ?? `${title}-${index}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openPublicCaseDetailInNewTab(app.id ?? title)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openPublicCaseDetailInNewTab(app.id ?? title)
                        }
                      }}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${animate ? 'animate-fade-in' : ''
                        }`}
                      style={
                        animate
                          ? { animationDelay: `${index * 80}ms` }
                          : undefined
                      }
                    >
                      {/* ── 封面图（16:9 宽屏比例） ─ */}
                      <div className="relative max-md:aspect-[9/16] aspect-video overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300">
                        <img
                          src={coverUrl}
                          alt={`${title}封面`}
                          loading="lazy"
                          className="size-full object-cover object-top transition-all duration-500 group-hover:scale-105"
                        />
                        {/* hover 渐变蒙层 + 底部预览按钮区 */}
                        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-all duration-300 group-hover:translate-y-0">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                          <div className="relative mx-3 mb-3 mt-auto pt-8">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openPublicCaseDetailInNewTab(app.id ?? title)
                              }}
                              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-white py-2.5 text-sm font-medium text-slate-800 shadow-md backdrop-blur-sm transition-colors hover:bg-white/95 active:scale-[0.98]"
                            >
                              <BookOpen className="size-4" aria-hidden="true" />
                              预览
                            </button>
                          </div>
                        </div>
                        {/* 角标 */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          {featured && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-semibold text-amber-900 shadow-sm backdrop-blur-sm">
                              <Star className="size-2.5 fill-amber-900 text-amber-900" aria-hidden="true" />
                              精选
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── 卡片信息区 ── */}
                      <div className="p-4">
                        <h3 className="line-clamp-1 text-sm font-semibold text-slate-950">
                          {title}
                        </h3>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          <img
                            src={app.author?.avatar || ''}
                            alt=""
                            className="size-6 shrink-0 rounded-full bg-slate-200 object-cover"
                            onError={(e) => {
                              ; (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <span className="truncate text-slate-500">{authorName}</span>
                          {createdAt && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="shrink-0">{createdAt}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              {/* ── 底部：加载更多 / 没有更多 ── */}
              <div className="mt-8 flex flex-col items-center justify-center">
                {hasMore ? (
                  <button
                    type="button"
                    disabled={isLoadingMore}
                    onClick={handleLoadMore}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-indigo-200 hover:text-indigo-600 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingMore || query.isFetching ? (
                      <>
                        <svg
                          className="size-4 animate-spin text-slate-400"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>加载中...</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-4" aria-hidden="true" />
                        <span>加载更多</span>
                      </>
                    )}
                  </button>
                ) : allCases.length > 0 ? (
                  <p className="text-sm text-slate-400">
                    — 已加载全部 {allCases.length} 个案例 —
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
