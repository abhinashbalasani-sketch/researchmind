import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Landing from './pages/Landing'
import AuthPage from './pages/Auth'
import Shell from './pages/Shell'
import Dashboard from './pages/Dashboard'
import NewResearch from './pages/NewResearch'
import SessionPage from './pages/Session'
import SettingsPage from './pages/Settings'
import type { ReactNode } from 'react'

function Guard({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="min-h-svh bg-ink p-10 text-mist">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route
          path="/app"
          element={
            <Guard>
              <Shell />
            </Guard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewResearch />} />
          <Route path="sessions/:id" element={<SessionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
