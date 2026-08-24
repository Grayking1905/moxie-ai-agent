# Moxie Setup Guide

## Quick Start (5 minutes)

Follow these steps to get Moxie running locally:

### 1. Install Dependencies

```bash
npm install
```

✅ Already completed!

### 2. Set Up Database

You'll need a PostgreSQL database. You can use:
- Local PostgreSQL
- [Neon](https://neon.tech) (free serverless PostgreSQL)
- [Supabase](https://supabase.com) (free PostgreSQL)

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your database URL:

```env
DATABASE_URL="postgresql://user:password@host:5432/moxie?schema=public"
```

**Using Neon (Recommended for quick setup):**
1. Go to [neon.tech](https://neon.tech)
2. Sign up (free)
3. Create a new project
4. Copy the connection string
5. Paste it in `.env` as `DATABASE_URL`

### 3. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed demo data
npm run db:seed
```

This creates:
- ✅ Moxie Tech Store (merchant)
- ✅ 10 demo products with relationships
- ✅ Buyer agent with permissions
- ✅ Merchant policy (spending limits)
- ✅ Demo customer

### 4. Configure Razorpay (Optional for full payment flow)

For the complete payment experience:

1. Sign up at [razorpay.com](https://razorpay.com) (test mode is free)
2. Get your Test API keys
3. Add to `.env`:

```env
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"
```

**Note:** The demo works without Razorpay by simulating payments.

### 5. Configure AI (Optional for enhanced experience)

For AI-powered features, add an OpenAI API key:

```env
OPENAI_API_KEY="sk-your-openai-api-key"
```

**Note:** The demo works without this using simulated AI responses.

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎯 What to Try

### Demo Scenario

1. **Start as Customer** → Go to "AI Buyer"
   - Try: "I need a waterproof backpack under ₹3,000"
   - Add items to cart
   - See intelligent upsells
   - Complete checkout
   - Approve payment

2. **Check Merchant Dashboard** → Go to "Merchant Dashboard"
   - View revenue metrics
   - See product catalog
   - Check recent orders
   - View AI commerce status

### Test Flows

**Product Search:**
```
"Show me laptop accessories"
"Find headphones under ₹4,000"
"I need a keyboard"
```

**Cart Operations:**
```
"Add the backpack to my cart"
"Show my cart"
"Add more items"
```

**Checkout:**
```
"I want to checkout"
"Proceed to buy"
```

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   Next.js App   │
│  (React 19)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │   API   │
    └────┬────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───▼────┐      ┌────────▼────────┐
│ Agent  │      │  Commerce       │
│ System │      │  Engine         │
└───┬────┘      └────────┬────────┘
    │                    │
    └────────┬───────────┘
             │
    ┌────────▼──────────┐
    │  Agent Firewall   │
    │  Policy Engine    │
    └────────┬──────────┘
             │
    ┌────────▼──────────┐
    │  Payment Service  │
    │  (Razorpay Test)  │
    └────────┬──────────┘
             │
    ┌────────▼──────────┐
    │    PostgreSQL     │
    │     (Prisma)      │
    └───────────────────┘
```

## 📁 Key Files

**Core Business Logic:**
- `lib/agent/firewall.ts` — Agent Firewall & Policy Engine
- `lib/agent/buyer-agent.ts` — AI Buyer Agent with tools
- `lib/commerce/engine.ts` — Product, cart, checkout logic
- `lib/payment/service.ts` — Razorpay integration
- `lib/audit/ledger.ts` — Decision Ledger & audit trail

**API Routes:**
- `app/api/buyer/chat/route.ts` — AI chat endpoint
- `app/api/buyer/approve/route.ts` — Approval endpoint
- `app/api/merchant/*` — Merchant API

**UI:**
- `app/buyer/page.tsx` — AI Buyer interface
- `app/merchant/page.tsx` — Merchant dashboard

## 🔧 Development

**Type checking:**
```bash
npm run lint
```

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm run start
```

## 🛡️ Security Features

1. **Agent Firewall** — All financial actions validated
2. **Policy Engine** — Spending limits enforced
3. **Approval Gates** — Human approval for large transactions
4. **Idempotent Payments** — No duplicate charges
5. **Audit Trail** — Complete transaction history
6. **Server-side Validation** — All amounts calculated server-side

## 📊 Demo Data

**Products:**
- TravelPro Backpack (₹2,499)
- Laptop Sleeve (₹799)
- Wireless Mouse (₹1,299)
- Mechanical Keyboard (₹4,999)
- Headphones (₹3,499)
- Webcam (₹2,999)
- USB-C Hub (₹2,499)
- Laptop Stand (₹1,999)
- Rain Cover (₹399)
- Power Bank (₹1,999)

**Policy Limits:**
- Max transaction: ₹5,000
- Approval threshold: ₹1,500
- Daily agent limit: ₹20,000
- Max discount: 15%

## 🎓 Learning Resources

**Understanding the Code:**
1. Start with `prisma/schema.prisma` to see data model
2. Read `lib/agent/firewall.ts` to understand safety layer
3. Check `lib/agent/buyer-agent.ts` for agent tools
4. Review `app/api/buyer/chat/route.ts` for API flow

**Key Concepts:**
- **Agent Firewall:** Every action goes through policy validation
- **Decision Ledger:** Complete audit trail of all actions
- **Idempotency:** Payments use unique keys to prevent duplicates
- **Bounded Actions:** AI proposes, deterministic systems execute

## 🐛 Troubleshooting

**Database connection error:**
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Try `npm run db:push` again

**Module not found:**
```bash
npm install
npm run db:generate
```

**Port already in use:**
```bash
# Use different port
PORT=3001 npm run dev
```

**Prisma errors:**
```bash
# Reset and regenerate
npm run db:generate
npm run db:push
```

## 📚 Next Steps

**Extend the Demo:**
1. Add more products with images
2. Implement real Razorpay payment flow
3. Add Growth Agent (Campaign Orchestrator)
4. Implement semantic search with embeddings
5. Add agent-to-agent negotiation
6. Build advanced analytics dashboard

**Production Considerations:**
- Set up production database
- Configure real payment provider
- Add authentication system
- Implement rate limiting
- Add monitoring (Sentry, DataDog)
- Set up CI/CD pipeline
- Add comprehensive testing

## 📝 Environment Variables Reference

```env
# Database (Required)
DATABASE_URL="postgresql://..."

# Razorpay Test Mode (Optional)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."

# AI Model (Optional)
OPENAI_API_KEY="sk-..."

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 🤝 Support

**Issues:**
- Check the README.md
- Review the PRD in `docs/`
- Check code comments

**Demo Video:**
Record your demo showing:
1. AI discovers products
2. AI recommends and upsells
3. Agent Firewall validates
4. Payment processes safely
5. Order confirmed with audit trail

---

**🎉 You're all set! Open http://localhost:3000 and experience AI-native commerce.**

Built with ❤️ for the AI commerce future.
