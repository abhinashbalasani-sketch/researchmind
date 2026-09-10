import { Link } from 'react-router-dom'
import { ArrowRight, AudioLines, GitBranch, Library, Radar, Search } from 'lucide-react'

const STEPS = [
  'Planner',
  'Source discovery',
  'Web research',
  'Academic research',
  'Extraction',
  'Verification',
  'Analysis',
  'Comparison',
  'Gaps',
  'Contradictions',
  'Synthesizer',
  'Report + voice',
]

export default function Landing() {
  return (
    <div className="min-h-svh bg-ink text-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-serif text-xl tracking-tight">
          Research<span className="text-gold">Mind</span>
        </div>
        <div className="flex gap-3 text-sm">
          <Link to="/login" className="rounded-full border border-line px-4 py-2 text-mist hover:text-paper">
            Sign in
          </Link>
          <Link to="/register" className="rounded-full bg-gold px-4 py-2 font-medium text-ink">
            Start researching
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <p className="mt-10 text-xs uppercase tracking-[0.28em] text-gold">Agentic research intelligence</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.1] text-[#f4ead3] md:text-6xl">
          A live multi-agent lab that actually searches, cites, and argues with sources.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mist">
          Enter a topic. ResearchMind plans the investigation, calls web and academic tools, embeds evidence for RAG,
          then writes a gap-aware report you can hear out loud. Not a single LLM paragraph pretending to be a pipeline.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 font-medium text-ink"
          >
            Create a workspace <ArrowRight size={18} />
          </Link>
          <a href="#pipeline" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-mist">
            See the agent stack
          </a>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-4">
          {[
            { icon: GitBranch, t: 'Planner agent', d: 'Decomposes the question and chooses tools.' },
            { icon: Search, t: 'Live web + OpenAlex', d: 'DuckDuckGo and scholarly APIs, not canned text.' },
            { icon: Library, t: 'RAG memory', d: 'Local hashed embeddings over papers, pages, and PDFs.' },
            { icon: AudioLines, t: 'Voice briefing', d: 'Browser speech synthesis of the research script.' },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-line bg-panel p-5">
              <c.icon className="text-gold" size={22} />
              <h3 className="mt-3 font-serif text-lg">{c.t}</h3>
              <p className="mt-2 text-sm text-mist">{c.d}</p>
            </div>
          ))}
        </div>

        <section id="pipeline" className="mt-20">
          <div className="mb-6 flex items-center gap-2 text-gold">
            <Radar size={18} />
            <h2 className="font-serif text-2xl text-[#f4ead3]">Autonomous pipeline</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <span key={s} className="rounded-full border border-line bg-panel px-3 py-1 text-sm text-mist">
                <span className="mr-1 text-gold">{i + 1}.</span>
                {s}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
