import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password)
      nav('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-ink px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-line bg-panel p-8">
        <Link to="/" className="font-serif text-xl text-paper">
          Research<span className="text-gold">Mind</span>
        </Link>
        <h1 className="mt-6 font-serif text-3xl text-[#f4ead3]">
          {mode === 'login' ? 'Welcome back' : 'Create your lab'}
        </h1>
        <p className="mt-2 text-sm text-mist">Local accounts by default. Supabase is optional.</p>
        <label className="mt-6 block text-sm text-mist">
          Email
          <input
            className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm text-mist">
          Password
          <input
            className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-gold py-2.5 font-medium text-ink disabled:opacity-60"
        >
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>
        <p className="mt-4 text-center text-sm text-mist">
          {mode === 'login' ? (
            <>
              New here? <Link className="text-gold" to="/register">Register</Link>
            </>
          ) : (
            <>
              Already have an account? <Link className="text-gold" to="/login">Sign in</Link>
            </>
          )}
        </p>
      </form>
    </div>
  )
}
