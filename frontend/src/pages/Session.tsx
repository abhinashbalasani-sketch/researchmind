import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api, getToken, API_BASE } from '../lib/api'
import { renderMarkdown } from '../lib/markdown'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Globe,
  Headphones,
  Loader2,
  Mic,
  Network,
  Pause,
  Play,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Upload,
  Wrench,
  X,
} from 'lucide-react'

type EventRow = {
  id?: string
  agent: string
  title?: string
  kind: string
  message?: string
  tool?: string
  data?: unknown
}

type Source = {
  id: string
  title: string
  url: string
  source_type: string
  score: number
  snippet: string
  venue?: string
  year?: number
  doi?: string
  authors?: string[]
}

type Evidence = {
  id: string
  claim: string
  excerpt: string
  title?: string
}

type CitationEdge = {
  source_paper_title: string
  target_paper_title: string
  target_doi?: string
  target_url?: string
  relation: string
}

type CriticReview = {
  rigor_score: number
  verdict: string
  strengths: string[]
  methodology_flags: string[]
  potential_biases: string[]
  recommendations: string[]
}

type SessionPayload = {
  session: { id: string; query: string; status: string; plan_json?: unknown; result_json?: unknown }
  sources: Source[]

  evidence: Evidence[]
  report: { markdown: string; voice_script: string } | null
  chat: { id: string; role: string; content: string }[]
  events?: EventRow[]
  citation_edges?: CitationEdge[]
  critic?: CriticReview | null
  has_audio?: boolean
}

export default function SessionPage() {
  const { id } = useParams()
  const [events, setEvents] = useState<EventRow[]>([])
  const [data, setData] = useState<SessionPayload | null>(null)
  const [chat, setChat] = useState('')
  const [restarting, setRestarting] = useState(false)
  const [activeTab, setActiveTab] = useState<'report' | 'graph'>('report')

  // Export State
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Audio State (Edge-TTS Neural)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [voiceChoice, setVoiceChoice] = useState('en-US-ChristopherNeural')
  const [audioMode, setAudioMode] = useState('solo')
  const [speakingLocal, setSpeakingLocal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Citation Evidence Drawer State
  const [selectedCitation, setSelectedCitation] = useState<Source | null>(null)

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Crawler Modal State
  const [crawlModalOpen, setCrawlModalOpen] = useState(false)
  const [crawlUrl, setCrawlUrl] = useState('')
  const [crawling, setCrawling] = useState(false)
  const [crawlMsg, setCrawlMsg] = useState('')

  async function refresh() {
    if (!id) return
    try {
      const d = await api<SessionPayload>(`/api/sessions/${id}`)
      setData(d)
      if (d.has_audio) {
        setAudioUrl(`${API_BASE}/api/sessions/${id}/audio?t=${Date.now()}`)
      }
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
    const es = new EventSource(`${API_BASE}/api/research/${id}/stream?token=${encodeURIComponent(token || '')}`)

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

  // Neural Audio Generator
  async function generateAudio() {
    if (!id || generatingAudio) return
    setGeneratingAudio(true)
    try {
      await api(`/api/sessions/${id}/audio`, {
        method: 'POST',
        body: JSON.stringify({ voice: voiceChoice, mode: audioMode }),
      })
      setAudioUrl(`${API_BASE}/api/sessions/${id}/audio?t=${Date.now()}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Audio generation failed')
    } finally {
      setGeneratingAudio(false)
    }
  }

  // Fallback browser speech
  function speakBrowser() {
    const script = data?.report?.voice_script
    if (!script || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(script)
    u.rate = 1
    u.onend = () => setSpeakingLocal(false)
    setSpeakingLocal(true)
    window.speechSynthesis.speak(u)
  }

  function stopBrowserSpeak() {
    window.speechSynthesis?.cancel()
    setSpeakingLocal(false)
  }

  // Public Share
  async function openShare() {
    if (!id) return
    try {
      const res = await api<{ token: string; share_url: string }>(`/api/sessions/${id}/share`, { method: 'POST' })
      const fullUrl = `${window.location.origin}${res.share_url}`
      setShareUrl(fullUrl)
      setShareModalOpen(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Share failed')
    }
  }

  function copyShareLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Web Crawler Execution
  async function handleCrawl(e: FormEvent) {
    e.preventDefault()
    if (!id || !crawlUrl.trim() || crawling) return
    setCrawling(true)
    setCrawlMsg('')
    try {
      const res = await api<{ sources_added: number }>(`/api/sessions/${id}/crawl`, {
        method: 'POST',
        body: JSON.stringify({ url: crawlUrl.trim(), max_pages: 6 }),
      })
      setCrawlMsg(`Successfully ingested ${res.sources_added} research resources!`)
      setCrawlUrl('')
      await refresh()
    } catch (e) {
      setCrawlMsg(e instanceof Error ? e.message : 'Crawl failed')
    } finally {
      setCrawling(false)
    }
  }

  // File Upload
  async function onUpload(f: File) {
    if (!id) return
    const fd = new FormData()
    fd.append('file', f)
    await api(`/api/sessions/${id}/upload`, { method: 'POST', body: fd })
    await refresh()
  }

  // Chat QA
  async function sendChat(e: FormEvent) {
    e.preventDefault()
    if (!id || !chat.trim()) return
    const msg = chat
    setChat('')
    await api(`/api/sessions/${id}/chat`, { method: 'POST', body: JSON.stringify({ message: msg }) })
    await refresh()
  }

  const result = data?.session.result_json as { llm?: string; source_count?: number; evidence_count?: number } | undefined
  const critic = data?.critic
  const citationEdges = data?.citation_edges || []

  return (
    <div className="space-y-8 pb-16">
      {/* Session Top Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-gold">Live session</p>
            {data?.session.status === 'running' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
                <Loader2 size={12} className="animate-spin" /> Live Pipeline
              </span>
            )}
            {data?.session.status === 'completed' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-xs text-emerald-400 border border-emerald-800/40">
                <CheckCircle2 size={12} /> Completed
              </span>
            )}
            {data?.session.status === 'failed' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/60 px-2.5 py-0.5 text-xs text-rose-400 border border-rose-800/40">
                <AlertCircle size={12} /> Failed
              </span>
            )}
          </div>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl text-[#f4ead3] leading-tight">
            {data?.session.query || 'Loading…'}
          </h1>
          <p className="mt-2 text-sm text-mist">
            Status: <span className="capitalize font-medium text-paper">{data?.session.status}</span>
            {result?.llm ? ` · LLM: ${result.llm}` : ''}
            {data?.sources ? ` · ${data.sources.length} sources` : ''}
            {data?.evidence ? ` · ${data.evidence.length} evidence items` : ''}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Deep Crawler Button */}
          <button
            onClick={() => setCrawlModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-2 text-xs font-medium text-mist hover:text-gold hover:border-gold transition-colors"
          >
            <Globe size={14} /> Crawl Lab / Web
          </button>

          {/* Share Button */}
          <button
            onClick={openShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-2 text-xs font-medium text-mist hover:text-gold hover:border-gold transition-colors"
          >
            <Share2 size={14} /> Share
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-2 text-xs font-medium text-mist hover:text-gold hover:border-gold transition-colors"
            >
              <Download size={14} /> Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-panel p-1.5 shadow-xl z-20 space-y-1">
                <a
                  href={`${API_BASE}/api/sessions/${id}/export?format=pdf`}
                  download
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-paper hover:bg-ink hover:text-gold"
                >
                  <FileDown size={14} /> Academic PDF
                </a>
                <a
                  href={`${API_BASE}/api/sessions/${id}/export?format=bibtex`}
                  download
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-paper hover:bg-ink hover:text-gold"
                >
                  <FileDown size={14} /> BibTeX (.bib)
                </a>
                <a
                  href={`${API_BASE}/api/sessions/${id}/export?format=markdown`}
                  download
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-paper hover:bg-ink hover:text-gold"
                >
                  <FileDown size={14} /> Markdown (.md)
                </a>
              </div>
            )}
          </div>

          {/* Rerun Button */}
          <button
            onClick={restartPipeline}
            disabled={restarting}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-2 text-xs font-medium text-mist hover:text-gold hover:border-gold transition-colors disabled:opacity-50"
          >
            <RotateCcw size={14} className={restarting ? 'animate-spin' : ''} />
            {restarting ? 'Restarting…' : 'Rerun pipeline'}
          </button>
        </div>
      </div>

      {/* Adversarial Critic Peer-Review Card */}
      {critic && (
        <div className="rounded-2xl border border-gold/40 bg-gradient-to-r from-panel via-panel to-gold/5 p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="text-gold" size={24} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base text-gold">Adversarial Critic Audit</h3>
                  <span className="rounded bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-gold">
                    Peer-Reviewed
                  </span>
                </div>
                <p className="text-xs text-mist mt-0.5">{critic.verdict}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gold/40 bg-ink px-3.5 py-1.5">
              <span className="text-xs text-mist uppercase tracking-wide">Rigor Score</span>
              <span className="font-mono text-xl font-bold text-gold">{critic.rigor_score}/100</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 border-t border-line/60 pt-3 sm:grid-cols-2 text-xs">
            <div>
              <p className="font-semibold text-mist uppercase tracking-wider">Methodology Review Notes:</p>
              <ul className="mt-1.5 space-y-1 text-paper/85">
                {critic.methodology_flags.map((m, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-gold">•</span> {m}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-mist uppercase tracking-wider">Recommendations for Replicability:</p>
              <ul className="mt-1.5 space-y-1 text-paper/85">
                {critic.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-gold">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Realistic Neural Audio Briefing Panel */}
      {data?.report?.voice_script && (
        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Headphones className="text-gold" size={20} />
              <div>
                <h3 className="font-serif text-base text-gold">Realistic Neural Audio Briefing</h3>
                <p className="text-xs text-mist">High-fidelity Edge-TTS voice briefing and podcast synthesis</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={voiceChoice}
                onChange={(e) => setVoiceChoice(e.target.value)}
                className="rounded-xl border border-line bg-ink px-2.5 py-1.5 text-xs text-mist outline-none focus:border-gold"
              >
                <option value="en-US-ChristopherNeural">Christopher (Male Neural)</option>
                <option value="en-US-JennyNeural">Jenny (Female Neural)</option>
              </select>

              <select
                value={audioMode}
                onChange={(e) => setAudioMode(e.target.value)}
                className="rounded-xl border border-line bg-ink px-2.5 py-1.5 text-xs text-mist outline-none focus:border-gold"
              >
                <option value="solo">Solo Narrator</option>
                <option value="podcast">Podcast Dialogue</option>
              </select>

              <button
                onClick={generateAudio}
                disabled={generatingAudio}
                className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-50"
              >
                {generatingAudio ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                {generatingAudio ? 'Synthesizing…' : 'Generate Neural Audio'}
              </button>

              <button
                onClick={speakingLocal ? stopBrowserSpeak : speakBrowser}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-mist hover:text-paper"
              >
                {speakingLocal ? <Pause size={13} /> : <Mic size={13} />}
                {speakingLocal ? 'Stop' : 'Browser WebSpeech'}
              </button>
            </div>
          </div>

          {audioUrl && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/60 pt-3">
              <audio ref={audioRef} controls src={audioUrl} className="flex-1 min-w-[260px] h-9" />
              <a
                href={audioUrl}
                download={`researchmind-${id?.slice(0, 8)}.mp3`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink px-3 py-2 text-xs text-gold hover:border-gold"
              >
                <Download size={13} /> Download MP3
              </a>
            </div>
          )}
        </div>
      )}

      {/* Agent Timeline Section */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-gold flex items-center gap-2">
            <Sparkles size={18} />
            Agent Timeline
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

      {/* Main View Tabs: Report vs Knowledge Graph */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab('report')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'report' ? 'bg-panel text-gold border border-line' : 'text-mist hover:text-paper'
          }`}
        >
          <Sparkles size={16} /> Research Report & Sources
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'graph' ? 'bg-panel text-gold border border-line' : 'text-mist hover:text-paper'
          }`}
        >
          <Network size={16} /> Citation & Knowledge Graph ({citationEdges.length + (data?.sources?.length || 0)})
        </button>
      </div>

      {/* Tab 1: Report & Sources */}
      {activeTab === 'report' && (
        <div className="space-y-8">
          {/* Sources List */}
          {data?.sources?.length ? (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl text-gold">Sources & Citations ({data.sources.length})</h2>
                <span className="text-xs text-mist">Click any source to inspect verified evidence</span>
              </div>
              <div className="mt-3 grid gap-2">
                {data.sources.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    onClick={() => setSelectedCitation(s)}
                    className="cursor-pointer rounded-xl border border-line bg-panel p-4 hover:border-gold transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="font-medium text-[#f4ead3] hover:underline flex items-center gap-1.5">
                        <span className="text-xs text-gold">[{idx + 1}]</span> {s.title}
                      </span>
                      <span className="rounded bg-ink px-2 py-0.5 text-xs text-mist border border-line whitespace-nowrap">
                        {s.source_type} · {s.score?.toFixed?.(2)}
                      </span>
                    </div>
                    {s.snippet && <p className="mt-1 line-clamp-2 text-xs text-mist">{s.snippet}</p>}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Full Markdown Report */}
          {data?.report && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-xl text-gold">Synthesized Report</h2>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-xs text-mist hover:border-gold hover:text-paper">
                  <Upload size={14} /> Ingest Extra PDF
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
              <div
                className="markdown mt-4 rounded-2xl border border-line bg-panel p-6 md:p-8"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(data.report.markdown) }}
              />
            </section>
          )}
        </div>
      )}

      {/* Tab 2: Interactive Knowledge & Citation Graph */}
      {activeTab === 'graph' && (
        <section className="rounded-2xl border border-line bg-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-gold flex items-center gap-2">
                <Network size={20} /> Multi-Hop Citation & Knowledge Network
              </h2>
              <p className="mt-1 text-xs text-mist">
                Discovered relationships connecting the central research topic, key academic papers, and foundational citations.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {/* Visual Flow Representation */}
            <div className="rounded-xl border border-line/70 bg-ink/70 p-5">
              <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-3">Topic Root:</p>
              <div className="inline-block rounded-xl border border-gold/60 bg-gold/10 px-4 py-2 font-serif text-base text-gold">
                {data?.session.query}
              </div>

              {/* Subtopics Nodes */}
              {result && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-mist uppercase tracking-wider mb-2">Decomposed Subtopics:</p>
                  <div className="flex flex-wrap gap-2">
                    {((data?.session.plan_json as { subtopics?: string[] })?.subtopics || [
                      'Core Methods',
                      'Case Studies',
                      'Limitations & Ethics',
                    ]).map((sub, i) => (
                      <span key={i} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-paper/90">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Citation Traversal Relationships */}
            <div>
              <h3 className="font-serif text-base text-gold mb-3">Academic Citation Traversal Links:</h3>
              {citationEdges.length === 0 ? (
                <p className="text-xs text-mist italic">
                  Citation traversal agent did not find referenced works for this query yet.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {citationEdges.map((edge, i) => (
                    <div key={i} className="rounded-xl border border-line bg-ink/50 p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-gold">
                        <span className="font-semibold">{edge.relation.toUpperCase()}</span>
                        <span className="text-mist">relationship</span>
                      </div>
                      <div className="text-xs font-medium text-paper line-clamp-2">{edge.source_paper_title}</div>
                      <div className="text-xs text-mist flex items-center gap-1">↓ foundational paper</div>
                      <div className="text-xs text-paper/80 bg-panel/70 p-2 rounded-lg border border-line/60 line-clamp-2">
                        {edge.target_paper_title}
                      </div>
                      {edge.target_url && (
                        <a
                          href={edge.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-gold hover:underline pt-1"
                        >
                          <ExternalLink size={12} /> Paper DOI Reference
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* RAG Interactive Evidence Chat */}
      <section>
        <h2 className="font-serif text-xl text-gold">RAG Chat Over Evidence</h2>
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
            className="flex-1 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm text-paper outline-none focus:border-gold"
            placeholder="Ask questions about this session’s cited evidence and models…"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
          />
          <button className="rounded-xl bg-gold px-4 text-ink hover:opacity-90">
            <Send size={18} />
          </button>
        </form>
      </section>

      {/* Slide-out Evidence Drawer (Feature 7) */}
      {selectedCitation && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-line bg-panel shadow-2xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gold flex items-center gap-1">
              <CheckCircle2 size={14} /> Verified Evidence Excerpt
            </span>
            <button onClick={() => setSelectedCitation(null)} className="rounded-lg p-1 text-mist hover:text-paper">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-serif text-lg text-[#f4ead3] leading-snug">{selectedCitation.title}</h3>
              <p className="mt-1 text-xs text-mist">
                {selectedCitation.venue ? `${selectedCitation.venue} · ` : ''}
                {selectedCitation.year ? `Year ${selectedCitation.year} · ` : ''}
                Credibility Score: {selectedCitation.score?.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl border border-line bg-ink p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">Extracted Excerpt Claim:</p>
              <p className="text-sm text-paper/90 leading-relaxed italic">“{selectedCitation.snippet}”</p>
            </div>

            <a
              href={selectedCitation.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink hover:opacity-90"
            >
              <ExternalLink size={16} /> Open Original Source
            </a>
          </div>
        </div>
      )}

      {/* Public Share Modal (Feature 9) */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-serif text-lg text-gold flex items-center gap-2">
                <Share2 size={18} /> Public Share Link
              </h3>
              <button onClick={() => setShareModalOpen(false)} className="rounded-lg p-1 text-mist hover:text-paper">
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-xs text-mist">
              Anyone with this link can view the complete research report, sources, and knowledge graph without signing in.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-xl border border-line bg-ink px-3 py-2 text-xs text-paper outline-none"
              />
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-1 rounded-xl bg-gold px-3.5 py-2 text-xs font-medium text-ink"
              >
                <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Research Web Crawler Modal */}
      {crawlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-serif text-lg text-gold flex items-center gap-2">
                <Globe size={18} /> Deep Research & Lab Web Crawler
              </h3>
              <button onClick={() => setCrawlModalOpen(false)} className="rounded-lg p-1 text-mist hover:text-paper">
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-xs text-mist">
              Enter a seed URL for a university research lab, author homepage, or arXiv paper. The crawler recursively navigates
              research links, extracts publications and PDF articles, and embeds them into your session.
            </p>
            <form onSubmit={handleCrawl} className="mt-4 space-y-3">
              <input
                type="url"
                required
                placeholder="https://arxiv.org/abs/2401.12345 or university lab URL..."
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-xs text-paper outline-none focus:border-gold"
              />
              {crawlMsg && <p className="text-xs text-gold">{crawlMsg}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCrawlModalOpen(false)}
                  className="rounded-xl border border-line px-4 py-2 text-xs text-mist hover:text-paper"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={crawling || !crawlUrl.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-xs font-medium text-ink disabled:opacity-50"
                >
                  {crawling ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                  {crawling ? 'Crawling…' : 'Start Deep Crawl'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
