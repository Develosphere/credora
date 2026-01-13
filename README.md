# Credora - AI-Powered CFO Platform

Credora is a comprehensive financial planning and analysis (FP&A) platform that integrates with e-commerce and advertising platforms to provide real-time financial insights, P&L analysis, cash flow forecasting, and AI-powered recommendations.

## Features

- **Dashboard** - Real-time KPIs including revenue, profit, and cash runway
- **P&L Analysis** - Detailed profit & loss statements with date range selection
- **Cash Flow Forecast** - Multi-scenario projections (conservative, expected, optimistic)
- **SKU Analytics** - Unit economics and profitability analysis per product
- **Campaign Performance** - Ad campaign ranking and ROAS analysis
- **AI Chat Assistant** - Natural language queries about your financial data
- **Platform Integrations** - Connect Shopify, Google Ads, and Meta Ads

## Architecture

The system consists of 4 main components:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Python API    │────▶│   Java Engine   │
│   (Next.js)     │     │   (FastAPI)     │     │  (Spring Boot)  │
│   Port: 3000    │     │   Port: 8000    │     │   Port: 8081    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   MCP Servers   │
                        │   (FastMCP)     │
                        │   Port: 8001    │
                        └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   (Supabase)    │
                        └─────────────────┘
```

## Prerequisites

- **Python 3.12+** with `uv` package manager
- **Node.js 18+** with npm
- **Java 17+** with Maven
- **PostgreSQL** database (Supabase recommended)

## Project Structure

```
credora/
├── credora/                    # Python backend
│   ├── api_server.py          # Main FastAPI server
│   ├── config.py              # Configuration
│   ├── database/              # Database connection & models
│   ├── services/              # Business logic services
│   │   └── fpa_cache.py       # FPA caching service
│   ├── mcp_servers/           # MCP server implementations
│   │   └── fastmcp/           # FastMCP servers
│   │       ├── combined_server.py
│   │       ├── google_server.py
│   │       ├── meta_server.py
│   │       ├── shopify_server.py
│   │       └── token_manager.py
│   └── tools/                 # Agent tools
├── credora-engine/            # Java FPA engine
│   ├── pom.xml
│   └── src/
│       └── main/java/com/credora/engine/
│           ├── EngineApplication.java
│           ├── controllers/   # REST controllers
│           ├── services/      # Business logic
│           ├── models/        # JPA entities
│           └── repositories/  # Data access
├── credora-frontend/          # Next.js frontend
│   ├── package.json
│   └── src/
│       ├── app/              # App router pages
│       ├── components/       # React components
│       └── lib/              # Utilities & API clients
├── .env                       # Environment variables
├── .env.example              # Example environment file
├── pyproject.toml            # Python dependencies
└── README.md
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd credora

# Install Python dependencies
uv sync

# Install frontend dependencies
cd credora-frontend
npm install
cd ..

# Install Java dependencies
cd credora-engine
mvn install -DskipTests
cd ..
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# OpenRouter API (for AI features)
OPENROUTER_API_KEY=your_openrouter_api_key

# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_AUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Google Ads API (for Google Ads integration)
GOOGLE_REDIRECT_URI=http://localhost:8000/oauth/callback/google
GOOGLE_DEVELOPER_TOKEN=your_developer_token

# Meta Ads (for Facebook/Instagram Ads integration)
META_CLIENT_ID=your_meta_app_id
META_CLIENT_SECRET=your_meta_app_secret
META_REDIRECT_URI=http://localhost:8000/oauth/callback/meta

# Shopify (for Shopify integration)
SHOPIFY_CLIENT_ID=your_shopify_api_key
SHOPIFY_CLIENT_SECRET=your_shopify_api_secret
SHOPIFY_REDIRECT_URI=http://localhost:8000/oauth/callback/shopify
```

### 3. Configure Frontend Environment

Create `credora-frontend/.env.local`:

```env
PYTHON_API_URL=http://localhost:8000
JAVA_ENGINE_URL=http://localhost:8081
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Database Setup

The system uses PostgreSQL. Required tables are created automatically, but ensure your database has the following tables:

- `users` - User accounts
- `transactions` - Financial transactions
- `products` - Product catalog
- `campaigns` - Ad campaigns
- `platform_connections` - OAuth connections
- `tokens` - OAuth tokens
- `pnl_reports` - Cached P&L reports
- `forecasts` - Cached forecasts

## Running the Application

You need **4 terminal windows** to run all services:

### Terminal 1: Java FPA Engine (Start First)

```bash
cd credora-engine
mvn spring-boot:run
```

Wait for: `Started EngineApplication in X seconds`

The Java engine runs on **http://localhost:8081**

### Terminal 2: Python API Server

```bash
cd credora
uv run python -m uvicorn credora.api_server:app --reload --port 8000
```

Wait for: `Application startup complete`

The API server runs on **http://localhost:8000**

### Terminal 3: MCP Servers (Optional - for platform data sync)

```bash
cd credora
uv run python -m credora.mcp_servers.fastmcp.combined_server
```

Wait for: `Uvicorn running on http://0.0.0.0:8001`

The MCP servers run on **http://localhost:8001**

### Terminal 4: Frontend

```bash
cd credora-frontend
npm run dev
```

Wait for: `Ready in X.Xs`

The frontend runs on **http://localhost:3000**

## Usage

1. Open **http://localhost:3000** in your browser
2. Sign in with Google
3. Connect your platforms (Shopify, Google Ads, Meta Ads) in Settings
4. View your dashboard, P&L, forecasts, and more

## API Endpoints

### Python API (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google/login` | GET | Initiate Google OAuth |
| `/auth/google/callback` | POST | Handle OAuth callback |
| `/auth/session` | GET | Get current session |
| `/fpa/dashboard` | GET | Get dashboard KPIs |
| `/fpa/pnl` | GET | Get P&L statement |
| `/fpa/forecast` | GET | Get cash flow forecast |
| `/fpa/sku-analysis` | GET | Get SKU analytics |
| `/fpa/campaigns` | GET | Get campaign rankings |
| `/platforms/status` | GET | Get platform connection status |
| `/platforms/{platform}/oauth` | GET | Initiate platform OAuth |
| `/health` | GET | Health check |

### Java Engine (Port 8081)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pnl/calculate` | POST | Calculate P&L |
| `/api/forecast/cash` | POST | Generate forecast |
| `/api/sku/analyze/all` | GET | Analyze all SKUs |
| `/api/campaigns/ranked` | GET | Get ranked campaigns |
| `/api/health` | GET | Health check |

## Development

### Running Tests

```bash
# Python tests
uv run pytest

# Java tests
cd credora-engine
mvn test

# Frontend tests
cd credora-frontend
npm test
```

### Code Quality

```bash
# Python linting
uv run ruff check .

# Frontend linting
cd credora-frontend
npm run lint
```

## Troubleshooting

### Common Issues

1. **"Invalid or expired OAuth state"**
   - Ensure the redirect URI in `.env` matches your OAuth provider settings
   - For Google Ads: `http://localhost:8000/oauth/callback/google`

2. **"0 transactions" in Java engine logs**
   - Check that the user UUID matches between Python API and database
   - Verify transactions exist in the database for that user

3. **Frontend shows "data.map is not a function"**
   - The API returned data in unexpected format
   - Check the Python API logs for errors

4. **Database connection failed**
   - Verify `DATABASE_URL` in `.env`
   - Ensure PostgreSQL is running and accessible

## License

Proprietary - All rights reserved

## Support

For issues and questions, please open a GitHub issue.
# credora
