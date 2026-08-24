# Moxie — AI Commerce Operating Layer

**An AI-native commerce infrastructure layer that makes merchants discoverable, recommendable, transactable, and optimizable by AI agents.**

## 🎯 Product Vision

Moxie transforms traditional merchants into AI-native merchants by providing:

1. **Agent-readable catalog** — Machine-readable product information
2. **Conversational commerce** — Natural language shopping experience
3. **Upsell & cross-sell agent** — AI-powered revenue optimization
4. **Campaign orchestrator** — Automated growth strategies
5. **Agent Firewall** — Safe, bounded AI actions
6. **Decision Ledger** — Complete audit trail
7. **Revenue Autopilot** — Continuous optimization

## 🏗️ Architecture

```
User/AI Agent
     ↓
Next.js App
     ↓
Commerce API
     ↓
Agent Firewall ← Policy Engine
     ↓
Commerce Engine
     ↓
Razorpay Test Mode
     ↓
PostgreSQL + Prisma
```

## ✨ Core Features

### 1. Agent-Readable Catalog
- Structured product information
- Machine-readable policies
- Inventory management
- Pricing rules

### 2. Conversational Checkout
- Natural language interaction
- Context-aware recommendations
- Intelligent upselling
- Seamless payment flow

### 3. Agent Firewall
- Permission management
- Spending limits
- Transaction validation
- Approval gates

### 4. Decision Ledger
- Complete audit trail
- Explainable recommendations
- Transaction replay
- Policy decision history

### 5. Payment Integration
- Razorpay Test Mode
- Idempotent operations
- Failure handling
- Webhook processing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Razorpay Test Account
- OpenAI API key (or compatible)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd new_agent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/moxie?schema=public"

# Razorpay Test Mode
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"

# AI Model
OPENAI_API_KEY="your_openai_api_key"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed demo data
npm run db:seed
```

This will create:
- **Moxie Tech Store** merchant
- **10 demo products** (laptops, accessories, peripherals)
- **Product relationships** (upsell/cross-sell)
- **Buyer agent** with permissions
- **Merchant policy** with spending limits
- **Demo customer**

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
new_agent/
├── app/                    # Next.js 15 app directory
│   ├── api/               # API routes
│   ├── merchant/          # Merchant dashboard
│   ├── buyer/             # AI buyer interface
│   └── page.tsx           # Home page
├── lib/                   # Core business logic
│   ├── agent/            # Agent system
│   │   ├── firewall.ts   # Agent Firewall
│   │   └── buyer-agent.ts # Buyer agent with tools
│   ├── commerce/         # Commerce engine
│   │   └── engine.ts     # Product, cart, checkout logic
│   ├── payment/          # Payment processing
│   │   └── service.ts    # Razorpay integration
│   ├── audit/            # Audit system
│   │   └── ledger.ts     # Decision Ledger
│   ├── db.ts             # Database client
│   └── utils.ts          # Utilities
├── prisma/               # Database schema
│   ├── schema.prisma     # Prisma schema
│   └── seed.ts           # Seed data
└── package.json
```

## 🔧 API Endpoints

### Commerce API (Agent-facing)

```
GET  /api/agent/catalog              # Get AI Commerce Passport
GET  /api/agent/products             # Search products
GET  /api/agent/products/:id         # Get product details
POST /api/agent/cart                 # Create cart
POST /api/agent/cart/:id/items       # Add to cart
POST /api/agent/checkout             # Create checkout
POST /api/agent/payment              # Request payment
GET  /api/agent/orders/:id           # Get order
```

### Merchant API

```
GET  /api/merchant/products          # List products
POST /api/merchant/products          # Create product
GET  /api/merchant/orders            # List orders
GET  /api/merchant/analytics         # Get analytics
GET  /api/merchant/campaigns         # List campaigns
POST /api/merchant/campaigns         # Create campaign
```

## 🛡️ Agent Firewall

Every financial action goes through the Agent Firewall:

```typescript
// Policy check
const decision = await AgentFirewall.validateTransaction(
  merchantId,
  amount,
  agentId
)

// Returns: ALLOW or DENY
// With reason and approval requirements
```

### Policy Rules

- **Max transaction**: ₹5,000
- **Daily limit**: ₹20,000
- **Approval threshold**: ₹1,500
- **Max discount**: 15%
- **Min margin**: 20%

## 📊 Decision Ledger

Complete audit trail of all agent actions:

```typescript
// Get transaction timeline
const timeline = await DecisionLedger.getTransactionTimeline(orderId)

// Get agent action history
const history = await DecisionLedger.getAgentHistory(agentId)

// Get policy decisions
const decisions = await DecisionLedger.getPolicyDecisions(merchantId)
```

## 💳 Payment Flow

```
1. Create Checkout
2. Policy Validation
3. Approval (if required)
4. Create Razorpay Order
5. Payment
6. Webhook Verification
7. Create Order
8. Confirm Order
```

### Failure Handling

- Idempotent operations
- Automatic retry mechanism
- No duplicate charges
- Cart preservation
- Complete audit trail

## 🤖 AI Buyer Agent

The buyer agent has structured tools:

- `search_products` — Find products by query/filters
- `get_product` — Get detailed product info
- `check_inventory` — Verify stock
- `create_cart` — Start shopping cart
- `add_to_cart` — Add products
- `recommend_product` — Get upsells/cross-sells
- `create_checkout` — Initiate checkout
- `request_payment` — Process payment

All tools go through the Agent Firewall.

## 📈 Demo Products

**Moxie Tech Store** includes:

- TravelPro Backpack (₹2,499)
- Laptop Sleeve (₹799)
- Wireless Mouse (₹1,299)
- Mechanical Keyboard (₹4,999)
- Noise Cancelling Headphones (₹3,499)
- HD Webcam (₹2,999)
- USB-C Hub (₹2,499)
- Laptop Stand (₹1,999)
- Rain Cover (₹399)
- Power Bank (₹1,999)

With pre-configured relationships for upsell/cross-sell.

## 🔐 Security

- **No LLM access to payment APIs**
- **No LLM access to database**
- **Server-side amount validation**
- **Webhook signature verification**
- **Idempotent payment operations**
- **Policy-based authorization**

## 🎯 Key Differentiators

1. **Agent Firewall** — Bounded, gated, explainable actions
2. **Decision Ledger** — Complete audit trail
3. **Conversational Commerce** — Natural language checkout
4. **AI Growth Agent** — Automated revenue optimization
5. **Failure Recovery** — Graceful error handling

## 📝 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js Route Handlers, tRPC
- **Database**: PostgreSQL, Prisma
- **Payment**: Razorpay Test Mode
- **AI**: OpenAI SDK (or compatible)

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Build production
npm run build
```

## 📚 Documentation

For detailed documentation, see:
- [Full PRD](docs/Moxie%20—%20AI%20Commerce%20Operating%20Layer%20_%20Full%20Product%20Requirements%20Document.md)
- API documentation (coming soon)
- Agent integration guide (coming soon)

## 🤝 Contributing

This is a demo/prototype project. For production use, additional considerations are needed:

- Production database
- Real payment processing
- Advanced fraud detection
- Rate limiting
- Comprehensive testing
- Monitoring and observability

## 📄 License

MIT License

## 🎉 Demo Scenario

The platform demonstrates:

1. **AI Sells** — Agent recommends products and upsells
2. **AI Buys** — Conversational checkout with policy validation
3. **AI Grows** — Campaign orchestration and revenue optimization

All while maintaining:
- ✅ Bounded spending
- ✅ Approval gates
- ✅ Complete audit trail
- ✅ Failure recovery

---

**Built with ❤️ for the AI commerce future**

Let AI sell. Let AI buy. Keep humans in control.
