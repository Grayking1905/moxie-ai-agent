import Link from 'next/link'
import { ShoppingBag, Store, Shield, FileText, TrendingUp, Zap, ArrowRight, CheckCircle, Cpu, Globe, Bot } from 'lucide-react'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-primary)',
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 32px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #6e56cf, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={16} color="white" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Moxie</span>
            <span className="tag-badge" style={{ marginLeft: 8 }}>AI Commerce</span>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it Works</a>
            <Link href="/merchant" className="nav-link">Merchant</Link>
            <Link href="/buyer" className="nav-link active" style={{ marginLeft: 8 }}>
              AI Buyer →
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '100px 32px 80px' }}>
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
          <div className="tag-badge" style={{ display: 'inline-flex', marginBottom: 24 }}>
            <Bot size={12} /> Agent-Native Commerce Platform
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 24,
            color: 'var(--text-primary)',
          }}>
            The AI Buyer That{' '}
            <span className="gradient-text">Negotiates</span>{' '}
            Like a Pro
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
            An autonomous AI buyer that searches the web, analyzes reviews, finds the best merchants, and negotiates deals — all on your behalf.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/buyer" className="btn-primary">
              <Bot size={16} /> Launch AI Buyer <ArrowRight size={14} />
            </Link>
            <Link href="/merchant" className="btn-outline">
              <Store size={16} /> Merchant Dashboard
            </Link>
          </div>
        </div>

        {/* Hero visual - pipeline preview */}
        <div className="panel fade-in" style={{ marginTop: 64, padding: 28, maxWidth: 900, margin: '64px auto 0', position: 'relative' }}>
          {/* Glow effect */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(110,86,207,0.15), transparent 70%)',
          }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace', marginBottom: 16 }}>
            AI BUYER PIPELINE — LIVE DEMO
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Parse Intent', done: true },
              { label: 'Web Search', done: true },
              { label: 'Find Merchants', done: true },
              { label: 'Analyze Reviews', active: true },
              { label: 'Negotiate Price', pending: true },
              { label: 'Checkout', pending: true },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={`agent-step ${s.active ? 'active' : s.done ? 'done' : ''}`}>
                  {s.done && '✓ '}{s.label}
                  {s.active && <span className="pulse-dot" style={{ display: 'inline-block', marginLeft: 8 }} />}
                </div>
                {i < 5 && <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            <span style={{ color: '#4ade80' }}>✓</span> Found 3 merchants · Market avg. ₹2,850 · <span style={{ color: '#a78bfa' }}>Analyzing sentiment from 247 reviews...</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            Core Capabilities
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Everything you need for AI-native commerce</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { icon: <Globe size={20} />, color: '#6e56cf', bg: 'rgba(110,86,207,0.12)', title: 'Web Research', desc: 'AI buyer searches the internet for product specs, reviews, competitor pricing, and merchant reputation before making decisions.' },
            { icon: <Bot size={20} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', title: 'Realistic Negotiation', desc: 'Acts as a human buyer, references market data, pushes back on pricing, and communicates naturally with merchants.' },
            { icon: <Shield size={20} />, color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', title: 'Agent Firewall', desc: 'Every purchase is policy-validated and bounded. AI proposes, humans approve. No runaway transactions.' },
            { icon: <ShoppingBag size={20} />, color: '#4ade80', bg: 'rgba(74,222,128,0.12)', title: 'Smart Catalog', desc: 'Machine-readable product catalog with AI-powered search, inventory checks, and intelligent recommendations.' },
            { icon: <FileText size={20} />, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', title: 'Decision Ledger', desc: 'Full audit trail of every agent action, negotiation step, and policy decision. Complete transparency.' },
            { icon: <TrendingUp size={20} />, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', title: 'Multi-Agent Shopping', desc: 'Multiple AI agents working in parallel — searching, comparing, and negotiating simultaneously for best outcomes.' },
          ].map((f, i) => (
            <div key={i} className="panel-card" style={{ padding: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, color: f.color
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              How the AI Buyer Works
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              Just tell Moxie what you want. It does the rest — researching, comparing, negotiating, and buying.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { step: '01', title: 'State Your Need', desc: 'Tell the AI what you want to buy and your budget constraints in natural language.' },
                { step: '02', title: 'AI Researches Online', desc: 'Gemini AI searches the web for product details, reviews, merchant ratings, and market prices.' },
                { step: '03', title: 'Filters & Negotiates', desc: 'AI shortlists merchants, checks Agent Reputation Scores, and negotiates the best deal.' },
                { step: '04', title: 'Secure Checkout', desc: 'After your approval, AI completes the transaction through the Agent Firewall safely.' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(110,86,207,0.12)', border: '1px solid rgba(110,86,207,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace'
                  }}>{s.step}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel - agent marketplace preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Agent to Agent Marketplace */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 14 }}>
                AGENT-TO-AGENT MARKETPLACE
              </div>
              {['Merchant Alpha — Electronics', 'Merchant Beta — Accessories', 'Merchant Gamma — Bundles'].map((m, i) => (
                <div key={i} className="merchant-item" style={{ marginBottom: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    border: '2px solid var(--accent-purple)',
                    background: i === 0 ? 'var(--accent-purple)' : 'transparent'
                  }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m}</span>
                  <div style={{ marginLeft: 'auto', fontSize: 11, color: '#4ade80' }}>●  Online</div>
                </div>
              ))}
            </div>

            {/* Multi-Agent Shopping */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 14 }}>
                MULTI-AGENT SHOPPING
              </div>
              {[
                ['Search', 'Filter', null],
                ['Research', 'Negotiate', 'Checkout'],
                ['Compare', 'Rank', null],
              ].map((row, ri) => (
                <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--text-muted)', flexShrink: 0 }} />
                  {row.filter(Boolean).map((t, ti, arr) => (
                    <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="task-node" style={ti === 1 && ri === 1 ? { borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)', background: 'rgba(110,86,207,0.1)' } : {}}>{t}</div>
                      {ti < arr.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 100px' }}>
        <div className="glow-border" style={{
          borderRadius: 20, padding: '64px 48px', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(110,86,207,0.15), rgba(79,70,229,0.1))',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 300, height: 2,
            background: 'linear-gradient(90deg, transparent, var(--accent-purple), transparent)'
          }} />
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
            Ready to Shop Smarter?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 36 }}>
            Let the AI Buyer handle research, negotiation, and checkout for you.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/buyer" className="btn-primary" style={{ fontSize: 15, padding: '12px 28px' }}>
              <Bot size={18} /> Launch AI Buyer
            </Link>
            <Link href="/merchant" className="btn-outline" style={{ fontSize: 15, padding: '12px 28px' }}>
              <Store size={18} /> Merchant View
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-primary)', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #6e56cf, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={12} color="white" />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Moxie — AI Commerce Operating Layer</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Let AI sell. Let AI buy. Keep humans in control.</span>
        </div>
      </footer>
    </div>
  )
}
