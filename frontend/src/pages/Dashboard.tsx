import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { FlaskConical, Plus } from 'lucide-react'

type Session = {
  id: string
  query: string
  status: string
  created_at: string
  project_title: string
}

export default function Dashboard() {
  const [rows, setRows] = useState<Session[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api<Session[]>('/api/sessions')
      .then(setRows)
      .catch((e: Error) => setErr(e.message))
  }, [])

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold">Workspace</p>
          <h1 className="mt-1 font-serif text-4xl text-[#f4ead3]">Research lab</h1>
        </div>
        <Link to="/app/new" className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink">
          <Plus size={16} /> New topic
        </Link>
      </div>
      {err && <p className="mt-4 text-sm text-red-300">{err}</p>}
      <div className="mt-8 grid gap-3">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-mist">
            <FlaskConical className="mx-auto mb-3 text-gold" />
            No sessions yet. Start with a research question.
          </div>
        )}
        {rows.map((s) => (
          <Link
            key={s.id}
            to={`/app/sessions/${s.id}`}
            className="rounded-2xl border border-line bg-panel p-5 hover:border-gold"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl text-[#f4ead3]">{s.query}</h2>
              <span className="rounded-full border border-line px-2 py-0.5 text-xs uppercase tracking-wide text-mist">
                {s.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-mist">
              {s.project_title} · {new Date(s.created_at).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
