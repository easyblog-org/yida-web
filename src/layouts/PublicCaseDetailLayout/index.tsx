import type { ReactNode } from 'react'

export default function PublicCaseDetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-slate-100 max-md:overflow-auto">
      {children}
    </div>
  )
}
