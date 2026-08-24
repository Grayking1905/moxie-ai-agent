import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { GoogleGenAI, Type, Content } from '@google/genai'
import { BuyerAgent, searchProductsSchema, addToCartSchema, createCheckoutSchema } from '@/lib/agent/buyer-agent'
import { z } from 'zod'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// ── Extract budget from user message ──────────────────────────────────────────
function extractBudget(msg: string): number | undefined {
  const patterns = [
    /under\s*[₹rs.]*\s*(\d[\d,]*)/i,
    /below\s*[₹rs.]*\s*(\d[\d,]*)/i,
    /budget[:\s]+[₹rs.]*\s*(\d[\d,]*)/i,
    /[₹rs.]+\s*(\d[\d,]*)/i,
    /(\d[\d,]+)\s*(?:rs|rupees|inr)/i,
    /max(?:imum)?\s*[₹rs.]*\s*(\d[\d,]*)/i,
  ]
  for (const re of patterns) {
    const m = msg.match(re)
    if (m) return parseInt(m[1].replace(/,/g, ''))
  }
}

// ── Extract search query keywords ──────────────────────────────────────────────
function extractSearchQuery(msg: string): string {
  return msg
    .replace(/under\s*[₹rs.]*\s*[\d,]+/gi, '')
    .replace(/below\s*[₹rs.]*\s*[\d,]+/gi, '')
    .replace(/budget[:\s]+[₹rs.]*\s*[\d,]+/gi, '')
    .replace(/[₹rs.]+\s*[\d,]+/gi, '')
    .replace(/[\d,]+\s*(?:rs|rupees|inr)/gi, '')
    .replace(/\b(i want to buy|buy me|find me|search for|looking for|need|get me)\b/gi, '')
    .replace(/\b(please|can you|could you)\b/gi, '')
    .trim() || msg.trim()
}

// ── Is this a product search intent? ──────────────────────────────────────────
function isSearchIntent(msg: string): boolean {
  return /find|search|buy|get|need|want|looking|show|recommend|suggest|cheap|best|top|where|price|cost/i.test(msg)
}

// ── Fetch real products via web search ─────────────────────────────────────────
async function fetchWebProducts(query: string, budget?: number) {
  const budgetStr = budget ? ` under ₹${budget}` : ''
  const prompt = `Search the web for REAL products: "${query}"${budgetStr} available on Indian e-commerce sites (Amazon.in, Flipkart, Myntra, Meesho, etc.).

Return a JSON object with:
- products: array of 3-5 real products with name, price(INR), originalPrice, discount, rating, reviewCount, store, storeUrl, brand, description, imageUrl, availability, deliveryInfo, highlights[], badge
- sellers: array of 2-4 real online sellers with name, platform, url, rating, reviewCount, verified, specialty, priceRange, topProduct
- reviews: array of 3-5 real customer reviews with product, rating, text, author, source, date, helpful
- marketInsight: 1-2 sentence market analysis
- negotiationTip: one practical tip for the buyer
- priceRange: {min, max, average} in INR

Only include REAL products from web search. All prices in INR. Return ONLY valid JSON.`

  try {
    const result = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    })

    const raw = (result.text || '').trim()
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    try { return JSON.parse(clean) } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) return JSON.parse(m[0])
      return null
    }
  } catch (err) {
    console.error('fetchWebProducts failed:', err)
    return null
  }
}

// ── Internal-catalog tool executors ───────────────────────────────────────────
type ToolCall = { name: string; args: Record<string, any> }
type ToolResult = { toolUseId?: string; content: string }

async function executeInternalTool(
  toolName: string,
  args: Record<string, any>,
  buyerAgent: BuyerAgent,
  merchantId: string,
  cartIdRef: { current: string | null }
): Promise<string> {
  try {
    if (toolName === 'add_to_cart') {
      let cid = args.cartId || cartIdRef.current
      if (!cid) {
        const r = await buyerAgent.executeTool('create_cart', { merchantId })
        cid = r.cartId
        cartIdRef.current = cid
      }
      const r = await buyerAgent.executeTool('add_to_cart', { ...args, cartId: cid })
      return JSON.stringify(r)
    }
    if (toolName === 'create_checkout') {
      const cid = args.cartId || cartIdRef.current
      if (!cid) return JSON.stringify({ error: 'No active cart. Add items first.' })
      try {
        const r = await buyerAgent.executeTool('create_checkout', { cartId: cid })
        return JSON.stringify(r)
      } catch (e: any) {
        return JSON.stringify({ error: e.message, policyViolation: true, reason: e.message })
      }
    }
    if (toolName === 'get_cart') {
      const cid = args.cartId || cartIdRef.current
      if (!cid) return JSON.stringify({ error: 'No active cart' })
      const r = await buyerAgent.executeTool('get_cart', { cartId: cid })
      return JSON.stringify(r)
    }
    if (toolName === 'search_internal_catalog') {
      const r = await buyerAgent.executeTool('search_products', args)
      return JSON.stringify(r)
    }
    return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  } catch (e: any) {
    return JSON.stringify({ error: e.message })
  }
}

// ── Tool declarations for Gemini ───────────────────────────────────────────────
const INTERNAL_TOOLS = [
  {
    name: 'search_internal_catalog',
    description: 'Search our internal product catalog. Use only when user asks to add a catalog product to cart.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Product search query' },
        category: { type: Type.STRING, description: 'Product category (optional)' },
        maxPrice: { type: Type.NUMBER, description: 'Maximum price filter (optional)' },
      },
    },
  },
  {
    name: 'add_to_cart',
    description: 'Add a product from the internal catalog to the shopping cart',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cartId: { type: Type.STRING, description: 'Cart ID (optional, will be created if missing)' },
        productId: { type: Type.STRING, description: 'Product ID from catalog' },
        quantity: { type: Type.NUMBER, description: 'Quantity to add' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'create_checkout',
    description: 'Create a checkout session from the current cart',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cartId: { type: Type.STRING, description: 'Cart ID (optional)' },
      },
    },
  },
  {
    name: 'get_cart',
    description: 'Get current cart contents and total',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cartId: { type: Type.STRING, description: 'Cart ID (optional)' },
      },
    },
  },
]

// ── Main POST handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, sessionId, cartId } = body

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'message and sessionId are required' }, { status: 400 })
    }

    // ── DB (optional — degrade gracefully) ───────────────────────────────────
    let merchant: any = null
    let agent: any = null
    let session: any = null
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = []

    try {
      merchant = await prisma.merchant.findFirst({ where: { status: 'ACTIVE' } })
      if (merchant) {
        agent = await prisma.agent.findFirst({
          where: { merchantId: merchant.id, type: 'BUYER_AGENT', status: 'ACTIVE' },
        })
      }
      if (agent) {
        session = await prisma.agentSession.findFirst({
          where: { agentId: agent.id, metadata: { path: ['sessionId'], equals: sessionId } },
        })
        if (!session) {
          session = await prisma.agentSession.create({
            data: { agentId: agent.id, status: 'ACTIVE', metadata: { sessionId } },
          })
        }
        await prisma.agentMessage.create({ data: { sessionId: session.id, role: 'user', content: message } })

        const dbHistory = await prisma.agentMessage.findMany({
          where: { sessionId: session.id },
          orderBy: { createdAt: 'asc' },
        })
        history = dbHistory.map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        }))
      }
    } catch (dbErr) {
      console.warn('DB unavailable, continuing in stateless mode:', (dbErr as Error).message.slice(0, 80))
      history = [{ role: 'user', content: message }]
    }

    // ── Web product search ────────────────────────────────────────────────────
    let webData: any = null
    if (isSearchIntent(message)) {
      const budget = extractBudget(message)
      const searchQuery = extractSearchQuery(message)
      webData = await fetchWebProducts(searchQuery, budget)
    }

    // ── Build Gemini conversation history (native format) ─────────────────────
    const geminiContents: Content[] = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }))

    // Ensure last message is from user
    if (!geminiContents.length || geminiContents[geminiContents.length - 1].role !== 'user') {
      geminiContents.push({ role: 'user', parts: [{ text: message }] })
    }

    // ── Compose system instructions ───────────────────────────────────────────
    let systemInstruction = `You are Moxie AI Buyer — an autonomous AI shopping agent that acts as a smart, realistic buyer on behalf of the user.

Personality:
- Confident and results-oriented, but friendly
- You negotiate hard using real market data
- Format responses clearly with **bold** and bullet points
- Always cite prices and platform names you found

Capabilities:
- Search the web (via Google Search) for real products from Amazon, Flipkart, Myntra, Meesho, and others
- Analyze customer reviews and seller reputation
- Negotiate based on market pricing data
- Add internal catalog products to cart when requested`

    if (webData) {
      const products = (webData.products || []).slice(0, 5)
      const sellers = (webData.sellers || []).slice(0, 3)
      systemInstruction += `\n\n## Real Products Found Online (from web search):
${products.map((p: any, i: number) =>
  `${i + 1}. **${p.name}** by ${p.brand || 'N/A'} — ₹${p.price?.toLocaleString('en-IN') || '?'} on ${p.store}${p.discount ? ` (${p.discount})` : ''}${p.rating ? ` · ${p.rating}⭐ (${(p.reviewCount || 0).toLocaleString()} reviews)` : ''}${p.deliveryInfo ? `\n   🚚 ${p.deliveryInfo}` : ''}`
).join('\n')}

## Active Sellers:
${sellers.map((s: any) => `- **${s.name}** on ${s.platform}${s.priceRange ? ` · ${s.priceRange}` : ''}${s.rating ? ` · ${s.rating}⭐` : ''}`).join('\n')}

## Market Insight: ${webData.marketInsight || ''}
## Price Range: ₹${webData.priceRange?.min?.toLocaleString('en-IN') || '?'} – ₹${webData.priceRange?.max?.toLocaleString('en-IN') || '?'} (avg ₹${webData.priceRange?.average?.toLocaleString('en-IN') || '?'})
## Negotiation Tip: ${webData.negotiationTip || ''}

Present the top 2-3 products to the user with analysis. Mention price vs market average. Suggest negotiation angles. Be concise.`
    }

    // ── Gemini function-calling loop ──────────────────────────────────────────
    const cartIdRef = { current: cartId as string | null }
    const buyerAgent = merchant && agent && session
      ? new BuyerAgent(merchant.id, agent.id, session.id)
      : null

    const geminiConfig: any = {
      systemInstruction,
      temperature: 0.7,
      maxOutputTokens: 1024,
      ...(buyerAgent ? { tools: [{ functionDeclarations: INTERNAL_TOOLS }] } : {}),
    }

    // Run with tool loop (max 4 iterations)
    let currentContents = [...geminiContents]
    let finalText = ''
    const toolMetadata: Record<string, any> = {}

    for (let iter = 0; iter < 4; iter++) {
      const result = await genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: currentContents,
        config: geminiConfig,
      })

      const candidate = result.candidates?.[0]
      if (!candidate) break

      const responseParts = candidate.content?.parts || []
      const textParts = responseParts.filter((p: any) => p.text)
      const functionCallParts = responseParts.filter((p: any) => p.functionCall)

      // Collect any text
      if (textParts.length > 0) {
        finalText = textParts.map((p: any) => p.text).join('')
      }

      // If no function calls, we're done
      if (functionCallParts.length === 0 || !buyerAgent) break

      // Execute function calls
      const functionResponseParts: any[] = []
      for (const part of functionCallParts) {
        const { name, args } = part.functionCall!
        const toolResult = await executeInternalTool(name!, args || {}, buyerAgent, merchant.id, cartIdRef)
        const parsed = JSON.parse(toolResult)

        // Collect metadata
        if (name === 'add_to_cart' && !parsed.error) toolMetadata.cart = parsed
        if (name === 'create_checkout') {
          if (parsed.requiresApproval) {
            toolMetadata.requiresApproval = true
            toolMetadata.checkoutId = parsed.checkoutId
            toolMetadata.approvalId = parsed.approvalId
          } else if (parsed.policyViolation) {
            toolMetadata.policyViolation = true
            toolMetadata.reason = parsed.reason
          }
        }

        functionResponseParts.push({
          functionResponse: { name, response: parsed },
        })
      }

      // Append model response + tool results to conversation
      currentContents = [
        ...currentContents,
        { role: 'model', parts: responseParts },
        { role: 'user', parts: functionResponseParts },
      ]
    }

    // ── Build final metadata ──────────────────────────────────────────────────
    const metadata: any = { ...toolMetadata }
    if (webData) {
      metadata.webProducts = webData.products || []
      metadata.sellers = webData.sellers || []
      metadata.reviews = webData.reviews || []
      metadata.marketInsight = webData.marketInsight
      metadata.negotiationTip = webData.negotiationTip
      metadata.priceRange = webData.priceRange
    }

    // Persist assistant message
    if (session) {
      try {
        await prisma.agentMessage.create({
          data: { sessionId: session.id, role: 'assistant', content: finalText, metadata },
        })
      } catch { /* skip */ }
    }

    return NextResponse.json({
      message: finalText,
      metadata,
      cartId: cartIdRef.current,
    })
  } catch (error: any) {
    console.error('Chat route error:', error)
    return NextResponse.json(
      { error: 'Failed to process message', details: error.message },
      { status: 500 }
    )
  }
}
