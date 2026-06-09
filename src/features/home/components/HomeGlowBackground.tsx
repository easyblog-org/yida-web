/**
 * 首页背景光晕（移动端优化版）
 *
 * 桌面端：使用 CSS blur 实现动态光晕（视觉效果最佳）
 * 移动端：使用静态 SVG 背景图模拟光晕（零 GPU 开销）
 *
 * SVG 光晕预渲染了模糊效果，浏览器只需解码一张图片，
 * 不需要每帧执行 filter:blur() 计算。
 */
export function HomeGlowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* 基础渐变（强色版） */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/60 via-sky-50/40 to-violet-200/50" />

      {/* ── 移动端：静态 SVG 光晕（零 GPU 开销）── */}
      <svg
        className="absolute inset-0 h-full w-full sm:hidden"
        viewBox="0 0 390 844"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* 顶部光晕：靛蓝→紫罗兰 */}
          <radialGradient id="glow-top" cx="50%" cy="-15%" r="85%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.72} />
            <stop offset="30%" stopColor="#a78bfa" stopOpacity={0.48} />
            <stop offset="65%" stopColor="#c4b5fd" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#ddd6fe" stopOpacity={0} />
          </radialGradient>
          {/* 右上光晕：天蓝→蓝 */}
          <radialGradient id="glow-right" cx="110%" cy="-5%" r="80%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.65} />
            <stop offset="35%" stopColor="#60a5fa" stopOpacity={0.40} />
            <stop offset="70%" stopColor="#93c5fd" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity={0} />
          </radialGradient>
          {/* 左侧暖色光晕：玫红→紫 */}
          <radialGradient id="glow-left" cx="-10%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#fb7185" stopOpacity={0.52} />
            <stop offset="38%" stopColor="#e9d5ff" stopOpacity={0.32} />
            <stop offset="75%" stopColor="#f3e8ff" stopOpacity={0.10} />
            <stop offset="100%" stopColor="#f3e8ff" stopOpacity={0} />
          </radialGradient>
          {/* 底部光晕：靛蓝→紫罗兰 */}
          <radialGradient id="glow-bottom" cx="35%" cy="115%" r="78%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.65} />
            <stop offset="36%" stopColor="#a78bfa" stopOpacity={0.42} />
            <stop offset="74%" stopColor="#c4b5fd" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#ddd6fe" stopOpacity={0} />
          </radialGradient>

          {/* 高斯模糊滤镜 */}
          <filter id="soft-edge">
            <feGaussianBlur stdDeviation="48" />
          </filter>
        </defs>

        {/* 顶部大光晕 */}
        <ellipse
          cx="195" cy="-80" rx="340" ry="280"
          fill="url(#glow-top)"
          filter="url(#soft-edge)"
        />
        {/* 右上光晕 */}
        <ellipse
          cx="490" cy="-40" rx="310" ry="265"
          fill="url(#glow-right)"
          filter="url(#soft-edge)"
        />
        {/* 左侧暖色光晕 */}
        <ellipse
          cx="-80" cy="280" rx="260" ry="225"
          fill="url(#glow-left)"
          filter="url(#soft-edge)"
        />
        {/* 底部光晕 */}
        <ellipse
          cx="100" cy="950" rx="290" ry="245"
          fill="url(#glow-bottom)"
          filter="url(#soft-edge)"
        />
      </svg>

      {/* ── 桌面端：CSS blur 动态光晕（保持原有视觉效果）── */}
      <div className="hidden sm:block">
        {/* 顶部大光晕 */}
        <div className="absolute left-1/2 top-0 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-300/15 via-violet-300/10 to-transparent blur-[200px]" />

        {/* 右上光晕 */}
        <div className="absolute -right-48 -top-20 h-[800px] w-[800px] rounded-full bg-gradient-to-l from-sky-300/15 via-blue-300/10 to-transparent blur-[180px]" />

        {/* 左侧中部暖色光晕 */}
        <div className="absolute -left-48 top-1/4 h-[700px] w-[700px] rounded-full bg-gradient-to-r from-rose-300/10 via-purple-300/10 to-transparent blur-[180px]" />

        {/* 底部光晕 */}
        <div className="absolute -bottom-48 left-1/4 h-[700px] w-[900px] rounded-full bg-gradient-to-t from-indigo-400/15 via-violet-400/10 to-transparent blur-[200px]" />
      </div>
    </div>
  )
}
