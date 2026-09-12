import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_BASE } from '../lib/api'
import { renderMarkdown } from '../lib/markdown'
import { CheckCircle2, Compass, ExternalLink, Network, ShieldCheck, Sparkles, X } from 'lucide-react'

type Source = {
  id: string
  title: string
  url: string
  source_type: string
  score: number
  snippet: string
  venue?: string
  year?: number
}

type Evidence = {
  id: string
  claim: string
  excerpt: string
  title?: string
}

type CriticReview = {
  rigor_score: number
  verdict: string
  strengths: string[]
  methodology_flags: string[]
  potential_biases: string[]
  recommendations: string[]
}

type CitationEdge = {
  source_paper_title: string
  target_paper_title: string
  target_url?: string
  relation: string
}

type PublicData = {
  session: { id: string; query: string; status: string; created_at: string; result_json?: unknown }
  sources: Source[]
  evidence: Evidence[]
  report: { markdown: string; voice_script: string } | null
  citation_edges: CitationEdge[]
  critic: CriticReview | null
}

export default function PublicSession() {
  const { token } = useParams()
  const [data, setData] = useState<PublicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [activeTab, setActiveTab] = useState<'report' | 'graph'>('report')
  const [selectedCitation, setSelectedCitation] = useState<Source | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/api/public/sessions/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Shared session not found or link has expired')
        return res.json() as Promise<PublicData>
      })
      .then(setData)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-svh bg-ink flex items-center justify-center text-paper">
        <p className="text-gold animate-pulse text-lg">Loading shared research briefing…</p>
      </div>
    )
  }

  if (err || !data) {
    return (
      <div className="min-h-svh bg-ink flex flex-col items-center justify-center p-6 text-center text-paper">
        <h1 className="font-serif text-3xl text-rose-300">Briefing Unavailable</h1>
        <p className="mt-2 text-mist">{err || 'Session not found'}</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm text-ink font-medium">
          <Compass size={16} /> Go to ResearchMind
        </Link>
      </div>
    )
  }

  const { session, report, sources, citation_edges, critic } = data

  return (
    <div className="min-h-svh bg-ink text-paper pb-20">
      {/* Top Banner */}
      <header className="border-b border-line bg-panel/70 backdrop-blur sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="font-serif text-lg font-bold">
            Research<span className="text-gold">Mind</span>
          </div>
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold border border-gold/30">
            Public Research Briefing
          </span>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-ink hover:opacity-90 transition-opacity"
        >
          <Compass size={14} /> Launch Your Own Research
        </Link>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold">Peer-Reviewed Synthesis</p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl text-[#f4ead3] leading-tight">{session.query}</h1>
          <p className="mt-2 text-xs text-mist">
            Generated on {new Date(session.created_at).toLocaleDateString()} · {sources.length} sources examined · Verified by
            ResearchMind autonomous agents
          </p>
        </div>

        {/* Critic Rigor Score Card */}
        {critic && (
          <div className="mt-6 rounded-2xl border border-gold/40 bg-gradient-to-r from-panel to-gold/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="text-gold" size={24} />
                <div>
                  <h3 className="font-serif text-base text-gold">Adversarial Critic Audit</h3>
                  <p className="text-xs text-mist">{critic.verdict}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-gold/40 bg-ink/70 px-3.5 py-1.5">
                <span className="text-xs text-mist uppercase tracking-wide">Rigor Score</span>
                <span className="font-mono text-xl font-bold text-gold">{critic.rigor_score}/100</span>
              </div>
            </div>
            {critic.methodology_flags?.length > 0 && (
              <div className="mt-3 border-t border-line/60 pt-3">
                <p className="text-xs font-semibold text-mist uppercase tracking-wider">Methodology Review Notes:</p>
                <ul className="mt-1.5 space-y-1 text-xs text-paper/85">
                  {critic.methodology_flags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-gold">•</span> {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* View Tabs */}
        <div className="mt-8 flex gap-2 border-b border-line pb-2">
          <button
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'report' ? 'bg-panel text-gold border border-line' : 'text-mist hover:text-paper'
            }`}
          >
            <Sparkles size={16} /> Research Report
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'graph' ? 'bg-panel text-gold border border-line' : 'text-mist hover:text-paper'
            }`}
          >
            <Network size={16} /> Citation & Knowledge Graph ({citation_edges.length + sources.length})
          </button>
        </div>

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="mt-6 space-y-8">
            {report && (
              <article
                className="markdown rounded-2xl border border-line bg-panel p-6 md:p-8 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(report.markdown) }}
              />
            )}

            {/* Sources List */}
            <section>
              <h2 className="font-serif text-xl text-gold">Verified References ({sources.length})</h2>
              <div className="mt-3 grid gap-2.5">
                {sources.map((s, idx) => (
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
                        {s.source_type} · {s.score?.toFixed(2)}
                      </span>
                    </div>
                    {s.snippet && <p className="mt-1.5 text-xs text-mist line-clamp-2 leading-relaxed">{s.snippet}</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Knowledge Graph Tab */}
        {activeTab === 'graph' && (
          <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
            <h2 className="font-serif text-lg text-gold flex items-center gap-2">
              <Network size={18} /> Discovered Citation Traversal Network
            </h2>
            <p className="mt-1 text-xs text-mist">
              Multi-hop paper citations and relationships discovered by the autonomous traversal agent.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {citation_edges.map((edge, i) => (
                <div key={i} className="rounded-xl border border-line bg-ink/70 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-gold">
                    <span className="font-semibold">{edge.relation.toUpperCase()}</span>
                    <span className="text-mist">relationship</span>
                  </div>
                  <div className="text-sm font-medium text-paper line-clamp-2">{edge.source_paper_title}</div>
                  <div className="text-xs text-mist flex items-center gap-1">↓ foundational citation</div>
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
          </div>
        )}
      </div>

      {/* Slide-out Evidence Drawer */}
      {selectedCitation && (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-md border-l border-line bg-panel shadow-2xl p-6 overflow-y-auto">
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
              <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">Extracted Excerpt:</p>
              <p className="text-sm text-paper/90 leading-relaxed italic">“{selectedCitation.snippet}”</p>
            </div>

            <a
              href={selectedCitation.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink"
            >
              <ExternalLink size={16} /> Open Original Source
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
