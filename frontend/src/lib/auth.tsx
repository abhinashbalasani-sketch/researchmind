import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, clearToken, getToken, setToken } from './api'

type User = { id: string; email: string }

type AuthCtx = {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setReady(true)
      return
    }
    api<{ user: User }>('/api/me')
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setReady(true))
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      async login(email, password) {
        const d = await api<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setToken(d.token)
        setUser(d.user)
      },
      async register(email, password) {
        const d = await api<{ token: string; user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setToken(d.token)
        setUser(d.user)
      },
      logout() {
        clearToken()
        setUser(null)
      },
    }),
    [user, ready],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('auth')
  return ctx
}
