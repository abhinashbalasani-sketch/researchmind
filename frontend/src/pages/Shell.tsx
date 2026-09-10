import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Compass, LogOut, Plus, Settings } from 'lucide-react'

export default function Shell() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  return (
    <div className="min-h-svh bg-ink text-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-panel p-5 md:block">
        <div className="font-serif text-xl">
          Research<span className="text-gold">Mind</span>
        </div>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 ${isActive ? 'bg-ink text-gold' : 'text-mist hover:text-paper'}`
            }
          >
            <Compass size={16} /> Lab
          </NavLink>
          <NavLink
            to="/app/new"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 ${isActive ? 'bg-ink text-gold' : 'text-mist hover:text-paper'}`
            }
          >
            <Plus size={16} /> New research
          </NavLink>
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 ${isActive ? 'bg-ink text-gold' : 'text-mist hover:text-paper'}`
            }
          >
            <Settings size={16} /> Settings
          </NavLink>
        </nav>
        <button
          className="absolute bottom-5 left-5 right-5 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-mist"
          onClick={() => {
            logout()
            nav('/')
          }}
        >
          <LogOut size={16} /> {user?.email}
        </button>
      </aside>
      <div className="md:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
