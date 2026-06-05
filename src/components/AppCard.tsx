import { Avatar, Card } from 'antd'

export type AppCardData = {
  id: string
  name: string
  coverUrl?: string
  authorName: string
  authorAvatarUrl?: string
  createdAt: string
}

export function AppCard({
  app,
  onClick,
  className,
}: {
  app: AppCardData
  onClick?: (app: AppCardData) => void
  className?: string
}) {
  const authorInitial = app.authorName.trim().slice(0, 1) || '用'

  return (
    <Card
      hoverable
      variant="outlined"
      aria-label={app.name}
      onClick={() => onClick?.(app)}
      className={[
        'h-full overflow-hidden rounded-xl! border-slate-200/70! bg-white! shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200! hover:shadow-lg hover:shadow-sky-900/10',
        onClick ? 'cursor-pointer' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      classNames={{
        body: 'p-0!',
        cover: 'overflow-hidden',
      }}
      cover={
        <div className="relative aspect-video overflow-hidden bg-linear-to-br from-sky-600 via-cyan-500 to-emerald-400">
          {app.coverUrl ? (
            <img
              src={app.coverUrl}
              alt={`${app.name}封面`}
              className="h-full w-full object-cover object-top transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-5 text-center text-white">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                易搭
              </span>
              <span className="mt-2 line-clamp-2 text-2xl font-bold leading-tight text-white/95">
                {app.name}
              </span>
            </div>
          )}
          <div
            className="absolute inset-0 bg-linear-to-t from-slate-950/20 via-transparent to-white/10"
            aria-hidden="true"
          />
        </div>
      }
    >
      <div className="flex min-h-24 flex-col justify-center gap-3 px-4 py-3">
        <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{app.name}</h3>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={app.authorAvatarUrl}
            size={34}
            className="shrink-0 bg-sky-100! text-sky-600!"
          >
            {authorInitial}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">{app.authorName}</p>
            <p className="truncate text-xs text-slate-400">{app.createdAt}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
