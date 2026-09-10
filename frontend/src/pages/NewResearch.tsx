import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const EXAMPLES = [
  'Applications of Agentic AI in Smart Education',
  'Retrieval-augmented generation for scientific literature reviews',
  'Fairness challenges in automated hiring systems',
]

export default function NewResearch() {
  const [query, setQuery] = useState(EXAMPLES[0])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const nav = useNavigate()

  async function start() {
    setBusy(true)
    setErr('')
    try {
      const d = await api<{ session_id: string }>('/api/research', {
        method: 'POST',
        body: JSON.stringify({ query, title: query.slice(0, 80) }),
      })
      nav(`/app/sessions/${d.session_id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-gold">New investigation</p>
      <h1 className="mt-1 font-serif text-4xl text-[#f4ead3]">What should the agents research?</h1>
      <p className="mt-3 max-w-2xl text-mist">
        The planner will split this into subtopics, then web and academic agents will retrieve live sources. You will
        see every tool call in the session timeline.
      </p>
      <textarea
        className="mt-6 min-h-36 w-full rounded-2xl border border-line bg-panel p-4 text-lg text-paper outline-none focus:border-gold"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setQuery(ex)}
            className="rounded-full border border-line px-3 py-1 text-xs text-mist hover:text-paper"
          >
            {ex}
          </button>
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      <button
        onClick={start}
        disabled={busy || query.trim().length < 3}
        className="mt-6 rounded-full bg-gold px-6 py-3 font-medium text-ink disabled:opacity-50"
      >
        {busy ? 'Opening session…' : 'Run agentic pipeline'}
      </button>
    </div>
  )
}
