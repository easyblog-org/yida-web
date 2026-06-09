import { Bot, UserRound } from 'lucide-react'

export function AppConversationAvatar({ role }: { role: 'assistant' | 'user' }) {
  if (role === 'assistant') {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 sm:size-8">
        <Bot
          className="size-3.5 sm:size-4"
          aria-hidden="true"
        />
      </div>
    )
  }

  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:size-8">
      <UserRound
        className="size-3.5 sm:size-4"
        aria-hidden="true"
      />
    </div>
  )
}
