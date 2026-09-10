import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api, getToken } from '../lib/api'
import { renderMarkdown } from '../lib/markdown'
import { AlertCircle, CheckCircle2, Loader2, Mic, Pause, RotateCcw, Send, Sparkles, Upload, Wrench } from 'lucide-react'

type EventRow = {
  id?: string
  agent: string
  title?: string
  kind: string
  message?: string
  tool?: string
  data?: unknown
}

type SessionPayload = {
  session: { id: string; query: string; status: string; result_json?: unknown }
  sources: { id: string; title: string; url: string; source_type: string; score: number; snippet: string }[]
  evidence: { id: string; claim: string; excerpt: string; title?: string }[]
  report: { markdown: string; voice_script: string } | null
  chat: { id: string; role: string; content: string }[]
  events?: EventRow[]
}

export default function SessionPage() {
  const { id } = useParams()
  const [events, setEvents] = useState<EventRow[]>([])
  const [data, setData] = useState<SessionPayload | null>(null)
  const [chat, setChat] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [restarting, setRestarting] = useState(false)

  async function refresh() {
    if (!id) return
    try {
      const d = await api<SessionPayload>(`/api/sessions/${id}`)
      setData(d)
      if (d.events && d.events.length > 0) {
        setEvents((prev) => {
          if (prev.length === 0) return d.events!
          const seen = new Set(prev.map((e) => `${e.agent}:${e.kind}:${e.message || ''}`))
          const missing = d.events!.filter((e) => !seen.has(`${e.agent}:${e.kind}:${e.message || ''}`))
          return missing.length > 0 ? [...prev, ...missing] : prev
        })
      }
    } catch (err) {
      console.error('Error refreshing session:', err)
    }
  }

  async function restartPipeline() {
    if (!id || restarting) return
    setRestarting(true)
    try {
      await api(`/api/research/${id}/restart`, { method: 'POST' })
      setEvents([])
      await refresh()
    } catch (e) {
      console.error('Failed to restart:', e)
    } finally {
      setRestarting(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let active = true
    const token = getToken()
    const es = new EventSource(`/api/research/${id}/stream?token=${encodeURIComponent(token || '')}`)

    es.onmessage = (m) => {
      if (!active) return
      try {
        const row = JSON.parse(m.data) as EventRow
        setEvents((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.agent === row.agent && last.kind === row.kind && last.message === row.message) {
            return prev
          }
          return [...prev, row]
        })
        if (row.kind === 'complete' && row.agent === 'orchestrator') {
          es.close()
          void refresh()
        }
        if (row.kind === 'already_done' || row.kind === 'error') {
          es.close()
          void refresh()
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err)
      }
    }

    es.onerror = () => {
      void refresh()
    }

    void refresh()

    return () => {
      active = false
      es.close()
    }
  }, [id, restarting])

  function speak() {
    const script = data?.report?.voice_script
    if (!script || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(script)
    u.rate = 1
    u.onend = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  function stopSpeak() {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  async function sendChat(e: FormEvent) {
    e.preventDefault()
    if (!id || !chat.trim()) return
    const msg = chat
    setChat('')
    await api(`/api/sessions/${id}/chat`, { method: 'POST', body: JSON.stringify({ message: msg }) })
    await refresh()
  }

  async function onUpload(f: File) {
    if (!id) return
    const fd = new FormData()
    fd.append('file', f)
    await api(`/api/sessions/${id}/upload`, { method: 'POST', body: fd })
    await refresh()
  }

  const result = data?.session.result_json as { llm?: string; source_count?: number; evidence_count?: number } | undefined

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-gold">Live session</p>
            {data?.session.status === 'running' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                <Loader2 size={12} className="animate-spin" /> Live Pipeline
              </span>
            )}
            {data?.session.status === 'completed' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-800/40">
                <CheckCircle2 size={12} /> Completed
              </span>
            )}
            {data?.session.status === 'failed' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/60 px-2 py-0.5 text-xs text-rose-400 border border-rose-800/40">
                <AlertCircle size={12} /> Failed
              </span>
            )}
          </div>
          <h1 className="mt-1 font-serif text-3xl text-[#f4ead3]">{data?.session.query || 'Loading…'}</h1>
          <p className="mt-2 text-sm text-mist">
            Status: <span className="capitalize font-medium text-paper">{data?.session.status}</span>
            {result?.llm ? ` · LLM: ${result.llm}` : ''}
            {result?.source_count != null ? ` · ${result.source_count} sources` : ''}
            {result?.evidence_count != null ? ` · ${result.evidence_count} evidence items` : ''}
          </p>
        </div>
        <button
          onClick={restartPipeline}
          disabled={restarting}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-4 py-2 text-xs font-medium text-mist hover:text-gold hover:border-gold transition-colors disabled:opacity-50"
        >
          <RotateCcw size={14} className={restarting ? 'animate-spin' : ''} />
          {restarting ? 'Restarting…' : 'Rerun pipeline'}
        </button>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-gold flex items-center gap-2">
            <Sparkles size={18} />
            Agent timeline
            <span className="text-xs font-sans font-normal text-mist">({events.length} events)</span>
          </h2>
          {data?.session.status === 'running' && (
            <span className="flex items-center gap-1.5 text-xs text-gold animate-pulse">
              <span className="h-2 w-2 rounded-full bg-gold"></span>
              Agents executing…
            </span>
          )}
        </div>

        <ol className="mt-4 space-y-2.5">
          {events.map((ev, i) => {
            const isTool = ev.kind === 'tool_call' || ev.kind === 'tool_result'
            const isError = ev.kind === 'error'
            const isComplete = ev.kind === 'complete'

            return (
              <li
                key={i}
                className={`rounded-xl border px-4 py-3 text-sm transition-all ${
                  isError
                    ? 'border-rose-800/60 bg-rose-950/20 text-rose-200'
                    : isComplete
                    ? 'border-gold/40 bg-gold/5'
                    : isTool
                    ? 'border-sky-900/40 bg-sky-950/10'
                    : 'border-line bg-panel'
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-gold">{ev.title || ev.agent}</span>
                  <span
                    className={`uppercase tracking-wide text-xs px-1.5 py-0.5 rounded ${
                      isError
                        ? 'bg-rose-900/60 text-rose-300'
                        : isComplete
                        ? 'bg-gold/20 text-gold'
                        : isTool
                        ? 'bg-sky-900/50 text-sky-300'
                        : 'bg-black/30 text-mist'
                    }`}
                  >
                    {ev.kind}
                  </span>
                  {ev.tool && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-800/50 bg-sky-950/40 px-2 py-0.5 text-xs text-sky-300">
                      <Wrench size={11} /> {ev.tool}
                    </span>
                  )}
                </div>
                {ev.message && <p className="mt-1.5 text-paper/90 leading-relaxed">{ev.message}</p>}
              </li>
            )
          })}

          {events.length === 0 && data?.session.status === 'running' && (
            <div className="rounded-xl border border-line bg-panel p-6 text-center text-mist">
              <Loader2 className="mx-auto mb-2 animate-spin text-gold" size={24} />
              <p className="text-paper">Connecting to live agent pipeline…</p>
              <p className="text-xs text-mist mt-1">Planner and research agents are initializing.</p>
            </div>
          )}

          {events.length === 0 && data?.session.status !== 'running' && (
            <div className="rounded-xl border border-line bg-panel p-6 text-center text-mist">
              <p>No timeline events recorded for this session.</p>
              <button
                onClick={restartPipeline}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-ink"
              >
                <RotateCcw size={13} /> Run agent pipeline
              </button>
            </div>
          )}
        </ol>
      </section>

      {data?.sources?.length ? (
        <section>
          <h2 className="font-serif text-xl text-gold">Sources</h2>
          <div className="mt-3 grid gap-2">
            {data.sources.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-line bg-panel p-4 hover:border-gold"
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium text-[#f4ead3]">{s.title}</span>
                  <span className="text-mist">
                    {s.source_type} · {s.score?.toFixed?.(2)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-mist">{s.snippet}</p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {data?.report && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-gold">Report</h2>
            <div className="flex gap-2">
              <button
                onClick={speaking ? stopSpeak : speak}
                className="inline-flex items-center gap-2 rounded-full border border-gold px-4 py-2 text-sm text-gold"
              >
                {speaking ? <Pause size={16} /> : <Mic size={16} />}
                {speaking ? 'Stop voice' : 'Voice explanation'}
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-mist">
                <Upload size={16} /> Upload PDF
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void onUpload(f)
                  }}
                />
              </label>
            </div>
          </div>
          <div
            className="markdown mt-4 rounded-2xl border border-line bg-panel p-6"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(data.report.markdown) }}
          />
        </section>
      )}

      <section>
        <h2 className="font-serif text-xl text-gold">RAG chat</h2>
        <div className="mt-3 space-y-2">
          {(data?.chat || []).map((m) => (
            <div
              key={m.id}
              className={`rounded-xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-panel border border-line' : 'bg-ink border border-gold/30'}`}
            >
              <p className="text-xs uppercase tracking-wide text-mist">{m.role}</p>
              <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={sendChat} className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-line bg-panel px-3 py-2 outline-none focus:border-gold"
            placeholder="Ask about this session’s evidence…"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
          />
          <button className="rounded-xl bg-gold px-3 text-ink">
            <Send size={18} />
          </button>
        </form>
      </section>
    </div>
  )
}
