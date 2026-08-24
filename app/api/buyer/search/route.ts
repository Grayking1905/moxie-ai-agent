import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// ── Schema types ──────────────────────────────────────────────────────────────
type WebProduct = {
  name: string; price: number; originalPrice?: number; discount?: string
  rating?: number; reviewCount?: number; store: string; storeUrl?: string
  brand?: string; description: string; imageUrl?: string; availability?: string
  deliveryInfo?: string; highlights?: string[]; badge?: string
}
type WebSeller = {
  name: string; platform: string; url?: string; rating?: number
  reviewCount?: number; verified?: boolean; specialty?: string
  priceRange?: string; topProduct?: string
}
type WebReview = {
  product: string; rating: number; text: string; author: string
  source: string; date?: string; helpful?: number
}

const STRUCTURED_PROMPT = (query: string, budget?: number) => `
You are a product research AI. Search the web for "${query}"${budget ? ` under ₹${budget}` : ''}.

Find REAL, currently available products from Indian e-commerce platforms (Amazon.in, Flipkart, Myntra, Meesho, Ajio, Nykaa, Croma, Reliance Digital, etc.).

Return a valid JSON object with exactly this structure:
{
  "products": [
    {
      "name": "Exact product name",
      "price": 1999,
      "originalPrice": 2499,
      "discount": "20% off",
      "rating": 4.3,
      "reviewCount": 1247,
      "store": "Amazon",
      "storeUrl": "https://amazon.in/...",
      "brand": "Brand Name",
      "description": "Brief description of key features",
      "imageUrl": "https://...",
      "availability": "In Stock",
      "deliveryInfo": "Free delivery by tomorrow",
      "highlights": ["Feature 1", "Feature 2", "Feature 3"],
      "badge": "Best Seller"
    }
  ],
  "sellers": [
    {
      "name": "Seller or Store Name",
      "platform": "Amazon / Flipkart / etc.",
      "url": "https://...",
      "rating": 4.5,
      "reviewCount": 5000,
      "verified": true,
      "specialty": "Electronics and gadgets",
      "priceRange": "₹1,500 - ₹4,000",
      "topProduct": "Best product they offer"
    }
  ],
  "reviews": [
    {
      "product": "Product name",
      "rating": 4.5,
      "text": "Actual review text from a real customer",
      "author": "Customer name or username",
      "source": "Amazon / Flipkart / Reddit",
      "date": "2024-08-10",
      "helpful": 45
    }
  ],
  "marketInsight": "Brief 1-2 sentence market analysis with average price and best deals.",
  "negotiationTip": "One specific tip for the buyer to get a better deal.",
  "priceRange": { "min": 999, "max": 4999, "average": 2500 }
}

Rules:
- Include 3-6 products, 2-4 sellers, 3-5 reviews
- Use REAL prices in Indian Rupees (INR)
- Only include products actually found via web search
- All URLs must be real product page URLs
- Keep descriptions concise and factual
- Return ONLY the JSON object, no markdown, no extra text
`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, budget } = body

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    const result = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: STRUCTURED_PROMPT(query, budget) }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    })

    const rawText = result.text?.trim() || ''
    // Strip any markdown code fences if present
    const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let data: any
    try {
      data = JSON.parse(cleanJson)
    } catch {
      // Try to extract JSON from response
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) {
        data = JSON.parse(match[0])
      } else {
        throw new Error('Failed to parse structured product data from Gemini response')
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Web search error:', error)
    return NextResponse.json({ error: 'Web search failed', details: error.message }, { status: 500 })
  }
}
