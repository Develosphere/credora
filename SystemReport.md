# Credora System Architecture & Status Report

**Generated:** January 4, 2026  
**Version:** 1.0.0

---

## System Overview

Credora is an AI-powered CFO agent for e-commerce businesses. It aggregates data from Shopify, Meta Ads, and Google Ads to provide financial analytics, P&L statements, cash flow forecasting, and SKU/campaign performance analysis.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CREDORA ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   Frontend   │────▶│  Python API  │────▶│      Java FPA Engine         │ │
│  │  (Next.js)   │     │  (FastAPI)   │     │   (Spring Boot + Kafka)      │ │
│  │  Port 3000   │     │  Port 8000   │     │       Port 8081              │ │
│  └──────────────┘     └──────┬───────┘     └──────────────┬───────────────┘ │
│                              │                            │                  │
│                              │                            │                  │
│                              ▼                            ▼                  │
│                    ┌──────────────────────────────────────────────┐         │
│                    │           PostgreSQL (Supabase)              │         │
│                    │  users | tokens | transactions | products    │         │
│                    │  campaigns | pnl_reports | forecasts         │         │
│                    └──────────────────────────────────────────────┘         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     MCP Servers (Port 8001)                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                      │   │
│  │  │  Shopify   │  │  Meta Ads  │  │ Google Ads │                      │   │
│  │  │  /shopify  │  │   /meta    │  │  /google   │                      │   │
│  │  └────────────┘  └────────────┘  └────────────┘                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Status

### ✅ WORKING COMPONENTS

#### 1. Next.js Frontend (Port 3000)
- **Location:** `credora-frontend/`
- **Status:** ✅ Fully Operational
- **Features:**
  - Google OAuth login/signup
  - Dashboard with KPIs (revenue, profit, runway, top SKU, worst campaign)
  - P&L page with date range selection
  - Forecast page with cash flow projections
  - Settings page for platform connections
  - Chat interface (UI ready, AI integration pending)

#### 2. Python API Server (Port 8000)
- **Location:** `credora/api_server.py`
- **Status:** ✅ Fully Operational
- **Features:**
  - User authentication via Google OAuth
  - Session management (in-memory, 7-day expiry)
  - Platform OAuth flows (Google Ads, Meta, Shopify)
  - Proxy to Java FPA Engine
  - Database CRUD operations
  - Token management via TokenManager class

#### 3. Java FPA Engine (Port 8081)
- **Location:** `credora-engine/`
- **Status:** ✅ Fully Operational
- **Features:**
  - P&L calculation from transactions
  - Cash flow forecasting (Monte Carlo simulation)
  - SKU profitability analysis
  - Campaign ROAS ranking
  - What-if scenario modeling
  - Kafka event streaming (optional)

#### 4. PostgreSQL Database (Supabase)
- **Location:** Cloud-hosted on Supabase
- **Status:** ✅ Connected & Operational
- **Connection:** Via `DATABASE_URL` in `.env`
- **Tables:**
  | Table | Status | Description |
  |-------|--------|-------------|
  | `users` | ✅ Working | User accounts (UUID, external_id/email, name) |
  | `tokens` | ✅ Ready | OAuth tokens for platform connections |
  | `transactions` | ✅ Working | Normalized financial transactions |
  | `products` | ✅ Ready | SKU/product catalog |
  | `campaigns` | ✅ Ready | Ad campaign data |
  | `pnl_reports` | ✅ Ready | Cached P&L calculations |
  | `forecasts` | ✅ Ready | Cash flow forecast results |
  | `platform_connections` | ✅ Ready | Platform connection state |
  | `exchange_rates` | ✅ Ready | Currency conversion rates |

---

### ⚠️ PARTIALLY WORKING / NEEDS CONFIGURATION

#### 5. MCP Servers (Port 8001)
- **Location:** `credora/mcp_servers/fastmcp/`
- **Status:** ⚠️ Servers Running, Credentials Not Configured

| Server | Endpoint | OAuth Status | API Status |
|--------|----------|--------------|------------|
| Google Ads | `/google` | ⚠️ Needs credentials | ⚠️ Untested |
| Meta Ads | `/meta` | ⚠️ Needs credentials | ⚠️ Untested |
| Shopify | `/shopify` | ⚠️ Needs credentials | ⚠️ Untested |

**Required Environment Variables:**
```env
# Google Ads (for platform connection, not user login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_DEVELOPER_TOKEN=your_developer_token
GOOGLE_REDIRECT_URI=http://localhost:8000/oauth/callback/google

# Meta Ads
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=http://localhost:8000/oauth/callback/meta

# Shopify
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_REDIRECT_URI=http://localhost:8000/oauth/callback/shopify
```

**Note:** MCP servers are built and mounted. OAuth flows are implemented. Actual API functionality will be verified once credentials are configured.

#### 6. Token Storage (Database)
- **Location:** `credora/mcp_servers/fastmcp/token_manager.py`
- **Status:** ⚠️ Implemented, Awaiting Platform Connection Test
- **Flow:**
  1. User clicks "Connect" on Settings page
  2. API server generates OAuth state, stores with user email
  3. User completes OAuth with platform
  4. Callback receives tokens
  5. TokenManager stores in `tokens` table using user's database UUID
- **Current State:** Tokens table is empty (no platforms connected yet)

---

### ❌ NOT YET IMPLEMENTED / PENDING

#### 7. AI Chat Agent
- **Location:** `credora/agents/`
- **Status:** ❌ UI Ready, Backend connected but takes too much time.
- **Notes:** Chat interface exists in frontend. Agent orchestration and LLM integration connected but takes too much time.

#### 8. Data Sync Jobs
- **Status:** ❌ Not Implemented
- **Notes:** Automatic periodic sync from platforms to database not yet built. Currently relies on manual triggers.

#### 9. Kafka Integration
- **Status:** ⚠️ Optional, Not Required for MVP
- **Notes:** Java engine supports Kafka for event streaming but works without it.

---

## Data Flow Diagrams

### User Authentication Flow
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │───▶│ API /auth│───▶│  Google  │───▶│ Callback │
│  Login   │    │  /login  │    │  OAuth   │    │ /callback│
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                     │
                     ┌───────────────────────────────┘
                     ▼
              ┌─────────────┐    ┌──────────┐
              │ Create/Get  │───▶│ Supabase │
              │    User     │    │  users   │
              └─────────────┘    └──────────┘
                     │
                     ▼
              ┌─────────────┐
              │  Session    │
              │  Token      │
              └─────────────┘
```

### Dashboard Data Flow
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │───▶│ API /fpa │───▶│  Java    │───▶│ Supabase │
│Dashboard │    │/dashboard│    │  Engine  │    │   DB     │
└──────────┘    └────┬─────┘    └──────────┘    └──────────┘
                     │
                     │ 1. Get user UUID from email
                     │ 2. Call Java engine with UUID
                     │ 3. Java queries transactions
                     │ 4. Returns aggregated KPIs
                     ▼
              ┌─────────────┐
              │  Response:  │
              │  revenue,   │
              │  profit,    │
              │  runway...  │
              └─────────────┘
```

### Platform Connection Flow (OAuth)
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Settings │───▶│ API /plat│───▶│ Platform │───▶│ Callback │
│  Page    │    │forms/oauth│   │  OAuth   │    │ /oauth/  │
└──────────┘    └────┬─────┘    └──────────┘    └────┬─────┘
                     │                               │
                     │ Store state                   │ Verify state
                     │ with user.id                  │ Get user.id
                     ▼                               ▼
              ┌─────────────┐              ┌─────────────┐
              │ _oauth_     │              │ TokenManager│
              │ _states{}   │              │ .store()    │
              └─────────────┘              └──────┬──────┘
                                                  │
                                                  ▼
                                           ┌──────────┐
                                           │ Supabase │
                                           │  tokens  │
                                           └──────────┘
```

---

## File Structure (Essential Files Only)

```
credora/
├── .env                          # Environment variables (secrets)
├── .env.example                  # Template for .env
├── pyproject.toml                # Python dependencies
├── README.md                     # Setup instructions
│
├── credora/                      # Python backend
│   ├── api_server.py             # Main FastAPI server (port 8000)
│   ├── config.py                 # Configuration management
│   ├── errors.py                 # Custom exceptions
│   ├── logging.py                # Logging setup
│   ├── security.py               # Token encryption
│   │
│   ├── database/
│   │   ├── connection.py         # PostgreSQL connection pool
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   │
│   ├── mcp_servers/fastmcp/
│   │   ├── combined_server.py    # Mounts all MCP servers
│   │   ├── google_server.py      # Google Ads MCP
│   │   ├── meta_server.py        # Meta Ads MCP
│   │   ├── shopify_server.py     # Shopify MCP
│   │   └── token_manager.py      # OAuth token storage
│   │
│   ├── services/
│   │   └── fpa_cache.py          # FPA engine client
│   │
│   └── tools/                    # Platform API wrappers
│       ├── google_ads.py
│       ├── meta_ads.py
│       └── shopify.py
│
├── credora-engine/               # Java backend
│   ├── pom.xml                   # Maven dependencies
│   └── src/main/java/com/credora/engine/
│       ├── CredoraEngineApplication.java
│       ├── controller/           # REST endpoints
│       ├── service/              # Business logic
│       ├── model/                # Data models
│       └── repository/           # Database access
│
├── credora-frontend/             # Next.js frontend
│   ├── package.json
│   ├── src/
│   │   ├── app/                  # Pages (dashboard, pnl, forecast, etc.)
│   │   ├── components/           # UI components
│   │   └── lib/                  # Utilities
│   └── .env.local                # Frontend env vars
│
└── tests/                        # Python tests
```

---

## Running the System

### Required Terminals (4)

| Terminal | Command | Port | Purpose |
|----------|---------|------|---------|
| 1 | `cd credora-engine && mvn spring-boot:run` | 8081 | Java FPA Engine |
| 2 | `uv run python -m uvicorn credora.api_server:app --reload --port 8000` | 8000 | Python API |
| 3 | `uv run python -m credora.mcp_servers.fastmcp.combined_server` | 8001 | MCP Servers |
| 4 | `cd credora-frontend && npm run dev` | 3000 | Frontend |

### Startup Order
1. Start Java Engine first (needs time to initialize)
2. Start Python API
3. Start MCP Servers
4. Start Frontend

---

## Known Issues & Limitations

1. **Session Storage:** In-memory only. Sessions lost on API restart.
2. **Token Encryption:** Tokens stored as plaintext in DB (encryption TODO).
3. **No Background Sync:** Platform data must be manually triggered.
4. **Single User Focus:** Multi-tenant isolation not fully tested.
5. **MCP Servers Untested:** Will verify once platform credentials are added.

---

## Next Steps

1. [ ] Configure platform credentials (Google Ads, Meta, Shopify)
2. [ ] Test OAuth flow end-to-end with real credentials
3. [ ] Verify tokens are stored in database after OAuth
4. [ ] Test data sync from platforms to database
5. [ ] Connect AI chat agent to backend
6. [ ] Add Redis for session storage (production)
7. [ ] Implement token encryption at rest

---

## Contact & Support

For issues or questions, check the debug endpoint:
- `http://localhost:8000/debug/db` - Database status, users, tokens

Check terminal logs for detailed debugging output.
