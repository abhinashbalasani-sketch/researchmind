import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function SettingsPage() {
  const [health, setHealth] = useState<{ llm?: string; supabase?: boolean } | null>(null)
  const [voice, setVoice] = useState(true)
  const [pref, setPref] = useState('auto')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api<{ llm: string; supabase: boolean }>('/api/health').then(setHealth).catch(() => null)
    api<{ preferences: { voice_enabled: boolean; llm_preference: string } }>('/api/me').then((d) => {
      setVoice(d.preferences.voice_enabled)
      setPref(d.preferences.llm_preference)
    })
  }, [])

  async function save() {
    await api('/api/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({ voice_enabled: voice, llm_preference: pref }),
    })
    setMsg('Saved locally. LLM provider is still selected by backend environment variables.')
  }

  return (
    <div>
      <h1 className="font-serif text-4xl text-[#f4ead3]">Settings</h1>
      <p className="mt-2 text-mist">
        Active backend LLM: <span className="text-gold">{health?.llm || '…'}</span>
        {' · '}
        Supabase mirror: {health?.supabase ? 'on' : 'off (SQLite)'}
      </p>
      <label className="mt-8 flex items-center gap-3 text-sm">
        <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} />
        Enable voice explanation by default
      </label>
      <label className="mt-4 block text-sm text-mist">
        Preferred provider label (does not override `.env` unless you wire it later)
        <select
          className="mt-1 block rounded-xl border border-line bg-panel px-3 py-2 text-paper"
          value={pref}
          onChange={(e) => setPref(e.target.value)}
        >
          <option value="auto">auto</option>
          <option value="groq">groq</option>
          <option value="ollama">ollama</option>
          <option value="openai">openai</option>
          <option value="none">none (tools only)</option>
        </select>
      </label>
      <button onClick={() => void save()} className="mt-6 rounded-full bg-gold px-5 py-2 font-medium text-ink">
        Save preferences
      </button>
      {msg && <p className="mt-3 text-sm text-mist">{msg}</p>}
    </div>
  )
}
