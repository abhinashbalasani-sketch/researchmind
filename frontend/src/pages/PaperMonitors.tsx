import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Bell, ExternalLink, Loader2, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'

type Paper = {
  title: string
  url: string
  venue?: string
  year?: number
  cited_by?: number
  doi?: string
  snippet?: string
  authors?: string[]
  is_recent?: boolean
}

type Monitor = {
  id: string
  topic: string
  frequency: string
  last_checked: string | null
  new_papers: Paper[]
  created_at: string
}

export default function PaperMonitors() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [topic, setTopic] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const nav = useNavigate()

  async function load() {
    try {
      const data = await api<Monitor[]>('/api/monitors')
      setMonitors(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load monitors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function createMonitor(e: FormEvent) {
    e.preventDefault()
    if (!topic.trim() || creating) return
    setCreating(true)
    setErr('')
    try {
      await api('/api/monitors', {
        method: 'POST',
        body: JSON.stringify({ topic: topic.trim(), frequency }),
      })
      setTopic('')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create monitor')
    } finally {
      setCreating(false)
    }
  }

  async function checkNow(id: string) {
    setCheckingId(id)
    try {
      await api(`/api/monitors/${id}/check`, { method: 'POST' })
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingId(null)
    }
  }

  async function deleteMonitor(id: string) {
    if (!confirm('Stop monitoring this topic?')) return
    try {
      await api(`/api/monitors/${id}`, { method: 'DELETE' })
      setMonitors((prev) => prev.filter((m) => m.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  async function startResearchOnPaper(paperTitle: string) {
    try {
      const d = await api<{ session_id: string }>('/api/research', {
        method: 'POST',
        body: JSON.stringify({ query: paperTitle, title: paperTitle.slice(0, 80) }),
      })
      nav(`/app/sessions/${d.session_id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start research')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Autonomous Surveillance</p>
        <h1 className="mt-1 font-serif text-3xl text-[#f4ead3]">New Paper Monitor & Alerts</h1>
        <p className="mt-2 text-sm text-mist">
          Set up autonomous tracking on your research keywords. ResearchMind scans OpenAlex and scholarly feeds for newly
          published preprints and papers.
        </p>
      </div>

      <form onSubmit={createMonitor} className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-serif text-lg text-gold flex items-center gap-2">
          <Plus size={18} /> Add New Topic Surveillance
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="e.g. Multi-Agent Reinforcement Learning in Robotics, Mamba Architecture..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="flex-1 min-w-[280px] rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-paper outline-none focus:border-gold"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none focus:border-gold"
          >
            <option value="daily">Daily checks</option>
            <option value="weekly">Weekly checks</option>
          </select>
          <button
            type="submit"
            disabled={creating || !topic.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
            {creating ? 'Setting alert…' : 'Monitor Topic'}
          </button>
        </div>
        {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
      </form>

      {loading ? (
        <div className="py-12 text-center text-mist">
          <Loader2 className="mx-auto mb-2 animate-spin text-gold" size={24} />
          Loading your monitored feeds…
        </div>
      ) : monitors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-mist">
          <Bell className="mx-auto mb-2 text-gold" size={28} />
          <p className="text-paper font-medium">No topics under surveillance yet.</p>
          <p className="mt-1 text-xs text-mist">Add a keyword above to receive automated preprint feeds.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {monitors.map((m) => (
            <div key={m.id} className="rounded-2xl border border-line bg-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl text-[#f4ead3]">{m.topic}</h2>
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs text-gold capitalize">
                      {m.frequency}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-mist">
                    Last scanned:{' '}
                    {m.last_checked ? new Date(m.last_checked).toLocaleString() : 'Just now'} · {m.new_papers.length} papers
                    detected
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => checkNow(m.id)}
                    disabled={checkingId === m.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-gold hover:border-gold disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={checkingId === m.id ? 'animate-spin' : ''} />
                    {checkingId === m.id ? 'Scanning…' : 'Check for new papers'}
                  </button>
                  <button
                    onClick={() => deleteMonitor(m.id)}
                    className="rounded-lg border border-line p-1.5 text-mist hover:text-rose-400 hover:border-rose-900"
                    title="Delete monitor"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {m.new_papers.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-xl border border-line/70 bg-ink/50 p-4 hover:border-gold/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-gold">
                          {p.year || 'Preprint'} {p.venue ? `· ${p.venue}` : ''}
                        </span>
                        {p.is_recent && (
                          <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-400 border border-emerald-800/40">
                            Recent
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-medium text-paper text-sm line-clamp-2">{p.title}</h3>
                      <p className="mt-1.5 text-xs text-mist line-clamp-2 leading-relaxed">{p.snippet}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-line/40 pt-2.5">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-mist hover:text-gold"
                      >
                        <ExternalLink size={12} /> Paper Link
                      </a>
                      <button
                        onClick={() => startResearchOnPaper(p.title)}
                        className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold hover:bg-gold hover:text-ink transition-colors"
                      >
                        <Play size={11} /> Deep Research
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
