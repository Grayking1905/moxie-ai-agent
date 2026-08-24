'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Send, ShoppingCart, CheckCircle, Loader2, Bot, Shield, History,
  Heart, Package, Wallet, User, Star, Zap, Store, Globe, ArrowRight,
  ExternalLink, TrendingDown, Info, RefreshCw, ChevronDown,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: ResponseMetadata
}

type WebProduct = {
  name: string
  price: number
  originalPrice?: number
  discount?: string
  rating?: number
  reviewCount?: number
  store: string
  storeUrl?: string
  brand?: string
  description: string
  imageUrl?: string
  availability?: string
  deliveryInfo?: string
  highlights?: string[]
  badge?: string
}

type WebSeller = {
  name: string
  platform: string
  url?: string
  rating?: number
  reviewCount?: number
  verified?: boolean
  specialty?: string
  priceRange?: string
  topProduct?: string
}

type WebReview = {
  product: string
  rating: number
  text: string
  author: string
  source: string
  date?: string
  helpful?: number
}

type ResponseMetadata = {
  webProducts?: WebProduct[]
  catalogProducts?: any[]
  sellers?: WebSeller[]
  reviews?: WebReview[]
  marketInsight?: string
  negotiationTip?: string
  priceRange?: { min: number; max: number; average: number }
  cart?: any
  requiresApproval?: boolean
  checkoutId?: string
  approvalId?: string
  policyViolation?: boolean
  reason?: string
}

type AgentStep = {
  id: string
  label: string
  status: 'pending' | 'active' | 'done'
}

// ─── Agent pipeline steps ───────────────────────────────────────────────────
const PIPELINE_STEPS: AgentStep[] = [
  { id: 'intent', label: 'Parsing intent & budget', status: 'pending' },
  { id: 'web', label: 'Searching source websites', status: 'pending' },
  { id: 'items', label: 'Finding matching items', status: 'pending' },
  { id: 'budget', label: 'Filtering by budget', status: 'pending' },
  { id: 'merchants', label: 'Finding selling merchants', status: 'pending' },
  { id: 'reputation', label: 'Checking Reputation Scores', status: 'pending' },
  { id: 'filter', label: 'Filtering merchants for negotiation', status: 'pending' },
  { id: 'show', label: 'Preparing filtered results', status: 'pending' },
]

// ─── Helper: format INR ──────────────────────────────────────────────────────
const rupee = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

// ─── Helper: star row ────────────────────────────────────────────────────────
function Stars({ rating, small }: { rating: number; small?: boolean }) {
  const sz = small ? 10 : 12
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={sz} fill={s <= Math.round(rating) ? '#fbbf24' : 'transparent'} color="#fbbf24" />
      ))}
      <span style={{ fontSize: sz, color: '#fbbf24', marginLeft: 3 }}>{rating.toFixed(1)}</span>
    </span>
  )
}

// ─── ProductCard ─────────────────────────────────────────────────────────────
function ProductCard({ p, index }: { p: WebProduct; index: number }) {
  const emojis = ['🎒', '💼', '📦', '🛒', '🖥️', '👟', '⌚', '📱']
  return (
    <div
      className="panel-card fade-in"
      style={{ padding: 14, cursor: 'pointer', position: 'relative', animationDelay: `${index * 60}ms` }}
    >
      {p.badge && (
        <div style={{
          position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700,
          padding: '2px 7px', borderRadius: 4,
          background: 'rgba(110,86,207,0.2)', color: '#a78bfa',
          border: '1px solid rgba(110,86,207,0.35)',
        }}>
          {p.badge}
        </div>
      )}

      {/* Product image / placeholder */}
      <div style={{
        width: '100%', aspectRatio: '1', height: 90,
        borderRadius: 8, overflow: 'hidden', marginBottom: 10,
        background: 'var(--bg-card-hover)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span style={{ fontSize: 28, color: 'var(--text-muted)' }}>{emojis[index % emojis.length]}</span>
        )}
      </div>

      {/* Name */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.3 }}>
        {p.name}
        {p.brand && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>· {p.brand}</span>}
      </div>

      {/* Description */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>
        {p.description.length > 70 ? p.description.slice(0, 70) + '…' : p.description}
      </div>

      {/* Price row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{rupee(p.price)}</span>
        {p.originalPrice && p.originalPrice > p.price && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{rupee(p.originalPrice)}</span>
        )}
        {p.discount && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#4ade80' }}>{p.discount}</span>
        )}
      </div>

      {/* Store + rating */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#6e56cf', fontWeight: 600 }}>{p.store}</span>
        {p.rating && <Stars rating={p.rating} small />}
      </div>

      {p.deliveryInfo && (
        <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text-muted)' }}>🚚 {p.deliveryInfo}</div>
      )}

      {p.storeUrl && (
        <a
          href={p.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 4, marginTop: 8,
            padding: '5px 8px', borderRadius: 6,
            background: 'rgba(110,86,207,0.1)', border: '1px solid rgba(110,86,207,0.25)',
            fontSize: 10, color: '#a78bfa', textDecoration: 'none', fontWeight: 600,
          }}
        >
          <ExternalLink size={9} /> View on {p.store}
        </a>
      )}
    </div>
  )
}

// ─── SellerCard ───────────────────────────────────────────────────────────────
function SellerCard({ s, selected, onClick }: { s: WebSeller; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
        borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
        border: `1px solid ${selected ? 'var(--accent-purple)' : 'var(--border-primary)'}`,
        background: selected ? 'rgba(110,86,207,0.1)' : 'var(--bg-card)',
        marginBottom: 8,
      }}
    >
      <div style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 3,
        border: `2px solid ${selected ? 'var(--accent-purple)' : 'var(--text-muted)'}`,
        background: selected ? 'var(--accent-purple)' : 'transparent',
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
          {s.verified && <span style={{ fontSize: 9, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', padding: '1px 5px', borderRadius: 3 }}>✓ Verified</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {s.platform}{s.priceRange ? ` · ${s.priceRange}` : ''}
        </div>
        {s.specialty && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.specialty}</div>}
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {s.rating && (
          <div style={{ fontSize: 10, color: '#fbbf24' }}>★ {s.rating.toFixed(1)}</div>
        )}
        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.reviewCount?.toLocaleString()} reviews</div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BuyerPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'system',
    content: "Welcome! I'm your AI Buyer powered by Gemini. Tell me what you want to buy and your budget — I'll search Amazon, Flipkart, Myntra and other stores, find real products, read reviews, and negotiate the best deal for you.",
  }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cartId, setCartId] = useState<string | null>(null)

  // Live data from web search
  const [liveProducts, setLiveProducts] = useState<WebProduct[]>([])
  const [liveSellers, setLiveSellers] = useState<WebSeller[]>([])
  const [liveReviews, setLiveReviews] = useState<WebReview[]>([])
  const [marketInsight, setMarketInsight] = useState<string>('')
  const [negotiationTip, setNegotiationTip] = useState<string>('')
  const [priceRange, setPriceRange] = useState<{ min: number; max: number; average: number } | null>(null)
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null)

  // Pipeline steps
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>(
    PIPELINE_STEPS.map(s => ({ ...s }))
  )
  const [pipelineVisible, setPipelineVisible] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Animate pipeline steps over time
  const animatePipeline = useCallback((totalMs: number) => {
    setPipelineVisible(true)
    setAgentSteps(PIPELINE_STEPS.map(s => ({ ...s, status: 'pending' })))
    const stepDuration = totalMs / PIPELINE_STEPS.length

    PIPELINE_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setAgentSteps(prev => prev.map((s, j) => ({
          ...s,
          status: j < i ? 'done' : j === i ? 'active' : 'pending',
        })))
      }, i * stepDuration)
    })

    setTimeout(() => {
      setAgentSteps(PIPELINE_STEPS.map(s => ({ ...s, status: 'done' })))
    }, totalMs)
  }, [])

  // Handle message send
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)
    animatePipeline(8000)

    try {
      const res = await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId: 'moxie-session-1', cartId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Request failed')
      }

      // Update cart
      if (data.cartId) setCartId(data.cartId)

      // Update live panels with real data from web search
      const meta: ResponseMetadata = data.metadata || {}

      if (meta.webProducts?.length) setLiveProducts(meta.webProducts)
      if (meta.sellers?.length) setLiveSellers(meta.sellers)
      if (meta.reviews?.length) setLiveReviews(meta.reviews)
      if (meta.marketInsight) setMarketInsight(meta.marketInsight)
      if (meta.negotiationTip) setNegotiationTip(meta.negotiationTip)
      if (meta.priceRange) setPriceRange(meta.priceRange)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        metadata: meta,
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message || 'Something went wrong. Please try again.'}`,
      }])
    } finally {
      setIsLoading(false)
      setAgentSteps(PIPELINE_STEPS.map(s => ({ ...s, status: 'done' })))
    }
  }, [input, isLoading, cartId, animatePipeline])

  // Handle checkout approval
  const handleApprove = async (checkoutId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/buyer/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: `✅ Purchase approved! ${data.message}`, metadata: data.metadata }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Approval failed. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  // Negotiate with a seller
  const handleNegotiate = (sellerName: string) => {
    setInput(`Negotiate with ${sellerName} — ask for the best possible discount on the product based on market price data. Act as a firm buyer and push for at least 10-15% off.`)
  }

  const navItems = [
    { label: 'Home', href: '/', icon: <Zap size={13} /> },
    { label: 'FireWall', href: '#', icon: <Shield size={13} /> },
    { label: 'History', href: '#', icon: <History size={13} /> },
    { label: 'WishList', href: '#', icon: <Heart size={13} /> },
    { label: 'Orders', href: '#', icon: <Package size={13} /> },
    { label: 'Wallet', href: '#', icon: <Wallet size={13} /> },
    { label: 'Profile', href: '#', icon: <User size={13} /> },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid var(--border-primary)',
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50, padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6e56cf,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={17} color="white" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Moxie</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {navItems.map(n => (
              <Link key={n.label} href={n.href} className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                {n.icon} {n.label}
              </Link>
            ))}
          </nav>

          {cartId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'rgba(110,86,207,0.12)', border: '1px solid rgba(110,86,207,0.3)', borderRadius: 8 }}>
              <ShoppingCart size={13} color="#a78bfa" />
              <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>Cart Active</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Main 2-col grid ────────────────────────────────────────────── */}
      <div style={{
        flex: 1, maxWidth: 1440, margin: '0 auto', width: '100%',
        padding: '14px 20px',
        display: 'grid', gridTemplateColumns: '290px 1fr', gap: 14,
      }}>

        {/* ── LEFT: Chat + Pipeline ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: 'calc(100vh - 82px)', position: 'sticky', top: 68 }}>
          <div className="panel" style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Chat header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-primary)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#6e56cf,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={13} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Moxie AI Buyer</div>
                <div style={{ fontSize: 10, color: isLoading ? '#a78bfa' : '#4ade80' }}>
                  {isLoading ? '⟳ Searching web...' : '● Online · Gemini 2.5'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10, paddingRight: 2 }}>
              {messages.map((msg, i) => (
                <div key={i} className="fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  {msg.role === 'system' && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: 11, lineHeight: 1.6, background: 'rgba(110,86,207,0.08)', border: '1px solid rgba(110,86,207,0.2)', color: '#c4b5fd' }}>
                      <Bot size={10} style={{ display: 'inline', marginRight: 5 }} />
                      {msg.content}
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div className="chat-user" style={{ fontSize: 12 }}>{msg.content}</div>
                    </div>
                  )}
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="chat-ai" style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>
                      {msg.metadata?.cart && (
                        <div style={{ padding: '8px 10px', background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 7, fontSize: 11, color: '#38bdf8' }}>
                          🛒 {msg.metadata.cart.itemsCount} item(s) · Total {rupee(msg.metadata.cart.total)}
                        </div>
                      )}
                      {msg.metadata?.requiresApproval && (
                        <button onClick={() => handleApprove(msg.metadata!.checkoutId!)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, color: '#4ade80', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                          <CheckCircle size={12} /> Approve Purchase
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8 }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: '#a78bfa' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Searching the web for real products...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pipeline */}
            {pipelineVisible && (
              <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 10, marginBottom: 10 }}>
                <div
                  onClick={() => setPipelineVisible(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 8 }}
                >
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>AGENT PIPELINE</span>
                  <ChevronDown size={10} color="var(--text-muted)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {agentSteps.map(step => (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 10, width: 12, textAlign: 'center', color: step.status === 'done' ? '#4ade80' : step.status === 'active' ? '#a78bfa' : 'var(--text-muted)' }}>
                        {step.status === 'done' ? '✓' : step.status === 'active' ? '⟳' : '○'}
                      </span>
                      <span className={`agent-step ${step.status}`} style={{ flex: 1, padding: '4px 8px', fontSize: 10 }}>
                        {step.label}
                        {step.status === 'active' && <span className="pulse-dot" style={{ display: 'inline-block', marginLeft: 8, width: 5, height: 5 }} />}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', gap: 7 }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder='e.g. "buy me a backpack under ₹3000"'
                disabled={isLoading}
                className="search-bar"
                style={{ fontSize: 12, padding: '10px 12px' }}
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim()} className="send-btn">
                {isLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              </button>
            </div>

            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
              Searches Amazon · Flipkart · Myntra · Meesho + more
            </div>
          </div>
        </div>

        {/* ── RIGHT: Products + Reviews + Marketplace ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Market insight bar */}
          {(marketInsight || priceRange) && (
            <div className="fade-in" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              background: 'rgba(110,86,207,0.08)', border: '1px solid rgba(110,86,207,0.25)', borderRadius: 10,
              flexWrap: 'wrap',
            }}>
              <Info size={13} color="#a78bfa" style={{ flexShrink: 0 }} />
              {priceRange && (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                  {rupee(priceRange.min)} – {rupee(priceRange.max)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>avg {rupee(priceRange.average)}</span>
                </span>
              )}
              {marketInsight && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{marketInsight}</span>
              )}
              {negotiationTip && (
                <span style={{ fontSize: 10, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <TrendingDown size={10} /> {negotiationTip}
                </span>
              )}
            </div>
          )}

          {/* Product grid */}
          <div className="panel" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  REAL PRODUCTS FROM WEB
                </span>
                {liveProducts.length > 0 && (
                  <span style={{ fontSize: 10, padding: '2px 7px', background: 'rgba(110,86,207,0.15)', border: '1px solid rgba(110,86,207,0.3)', borderRadius: 99, color: '#a78bfa' }}>
                    {liveProducts.length} found
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {isLoading && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', color: '#a78bfa' }} />}
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {isLoading ? 'Searching...' : liveProducts.length > 0 ? 'Live results' : 'Ask AI to search'}
                </span>
              </div>
            </div>

            {liveProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
                {liveProducts.map((p, i) => <ProductCard key={i} p={p} index={i} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12, color: 'var(--text-muted)' }}>
                <Globe size={32} style={{ opacity: 0.3 }} />
                <div style={{ fontSize: 13, textAlign: 'center' }}>
                  Ask the AI Buyer to find products.<br />
                  <span style={{ fontSize: 11 }}>e.g. "I need a waterproof backpack under ₹3000"</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Reviews + Merchant Marketplace */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Reviews */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  WEB REVIEWS & RESEARCH
                </span>
                <Globe size={10} color="var(--text-muted)" />
              </div>

              {liveReviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {liveReviews.map((r, i) => (
                    <div key={i} className="panel-card fade-in" style={{ padding: 12, animationDelay: `${i * 80}ms` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', maxWidth: '65%' }}>{r.product}</span>
                        <Stars rating={r.rating} small />
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>"{r.text}"</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Globe size={9} color="var(--text-muted)" />
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.author} · {r.source}</span>
                        </div>
                        {r.helpful && (
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.helpful} found helpful</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: 10, color: 'var(--text-muted)' }}>
                  <Star size={28} style={{ opacity: 0.25 }} />
                  <div style={{ fontSize: 12, textAlign: 'center' }}>Reviews will appear here after web search</div>
                </div>
              )}
            </div>

            {/* Merchant marketplace + Multi-agent */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Agent-to-Agent Marketplace */}
              <div className="panel" style={{ padding: 18, flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14 }}>
                  AGENT-TO-AGENT MARKETPLACE
                </div>

                {liveSellers.length > 0 ? (
                  <>
                    {liveSellers.map((s, i) => (
                      <SellerCard
                        key={i}
                        s={s}
                        selected={selectedSeller === s.name}
                        onClick={() => setSelectedSeller(prev => prev === s.name ? null : s.name)}
                      />
                    ))}
                    {selectedSeller && (
                      <button
                        onClick={() => handleNegotiate(selectedSeller)}
                        className="btn-primary"
                        style={{ fontSize: 11, padding: '8px 12px', width: '100%', justifyContent: 'center', marginTop: 4 }}
                      >
                        <Store size={12} /> Negotiate with {selectedSeller} <ArrowRight size={11} />
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 12px', gap: 8, color: 'var(--text-muted)' }}>
                    <Store size={24} style={{ opacity: 0.25 }} />
                    <div style={{ fontSize: 11, textAlign: 'center' }}>Real merchant data will appear after web search</div>
                  </div>
                )}
              </div>

              {/* Multi-Agent Shopping Task Flow */}
              <div className="panel" style={{ padding: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14 }}>
                  MULTI-AGENT SHOPPING
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { tasks: ['Search Web', 'Filter Budget'], done: pipelineVisible },
                    { tasks: ['Research Prices', 'Negotiate', 'Checkout'], done: pipelineVisible },
                    { tasks: ['Compare Deals', 'Rank Sellers'], done: pipelineVisible },
                  ].map((row, ri) => {
                    const stepStatus = agentSteps[ri * 2 + 1]?.status
                    return (
                      <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${stepStatus === 'done' ? '#4ade80' : 'var(--text-muted)'}`, flexShrink: 0, background: stepStatus === 'active' ? '#a78bfa' : 'transparent' }} />
                        {row.tasks.map((t, ti) => (
                          <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div
                              className="task-node"
                              style={{
                                fontSize: 10, padding: '5px 9px',
                                ...(stepStatus === 'active' && ti === 0 ? { borderColor: 'var(--accent-purple)', color: '#a78bfa', background: 'rgba(110,86,207,0.1)' } : {}),
                                ...(stepStatus === 'done' ? { borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80', background: 'rgba(74,222,128,0.05)' } : {}),
                              }}
                            >
                              {stepStatus === 'done' ? '✓ ' : ''}{t}
                            </div>
                            {ti < row.tasks.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→</span>}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
