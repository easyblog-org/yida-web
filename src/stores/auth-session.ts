import type { UserVO } from '@/api/generated/models'
import { proxyCdnUrls } from '@/api/mutator/custom-instance'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthSessionState {
  accessToken: string | null
  user: UserVO | null
  setSession: (payload: { accessToken: string; user: UserVO }) => void
  setUser: (user: UserVO) => void
  clearSession: () => void
}

export const useAuthSessionStore = create<AuthSessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: ({ accessToken, user }) => set({ accessToken, user: proxyCdnUrls(user) }),
      setUser: (user) => set({ user: proxyCdnUrls(user) }),
      clearSession: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'auth-session',
    },
  ),
)
