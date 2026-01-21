# Credora - AI-Powered CFO Agent Platform

An intelligent CFO agent system that provides financial analysis, insights, and recommendations for e-commerce businesses using AI agents, RAG (Retrieval-Augmented Generation), and real-time data integration.

## 🚀 Features

### ✅ Implemented Features

#### 1. **AI CFO Chat Agent**
- Multi-agent orchestration system with specialized agents
- Natural language interface for business queries
- Context-aware conversations with session management
- Automatic agent handoffs based on query intent

#### 2. **RAG-Based Data Retrieval**
- FAISS vector database with 35+ embedded business documents
- Local sentence-transformers embeddings (no API costs)
- Semantic search across products, orders, and campaigns
- Fast retrieval with 384-dimensional embeddings

#### 3. **Specialized AI Agents**
- **CFO Agent**: Main orchestrator for all queries
- **RAG Data Agent**: Vector database search and retrieval
- **Data Fetcher Agent**: Live API data from connected platforms
- **Analytics Agent**: Trend analysis and pattern identification
- **Competitor Agent**: Market research and competitor analysis
- **Insight Agent**: Actionable recommendations
- **Onboarding Agent**: User setup and platform connections

#### 4. **Platform Integrations**
- **Shopify**: Products, orders, customers, inventory
- **Google Ads**: Campaigns, keywords, ad groups, performance
- **Meta Ads**: Facebook/Instagram campaigns and metrics
- OAuth 2.0 authentication for secure connections
- Token encryption and secure storage

#### 5. **Financial Analysis Engine (Java)**
- P&L statement generation
- Cash flow forecasting with dynamic programming
- Campaign ranking with heap data structures
- SKU analysis and profitability tracking
- What-if scenario simulations
- Optimal pricing calculations

#### 6. **Modern UI/UX**
- Dark theme with glassmorphism design
- Real-time chat interface with streaming responses
- Dashboard with key metrics and visualizations
- Settings page with platform connection management
- Profile picture upload with image preview
- Responsive design for all screen sizes

#### 7. **Data Management**
- PostgreSQL database (Supabase)
- Automated data synchronization
- Currency normalization
- Transaction tracking
- Session and chat history storage

#### 8. **Security Features**
- Token encryption for OAuth credentials
- Secure session management
- Environment-based configuration
- Database connection pooling

### 🔧 Technical Stack

**Backend:**
- Python 3.13 with FastAPI
- LangChain for RAG implementation
- FAISS for vector storage
- OpenRouter API for LLM access
- AsyncPG for database operations

**Frontend:**
- Next.js 15 with TypeScript
- React 19 with Server Components
- TailwindCSS for styling
- Framer Motion for animations
- React Query for state management

**FP&A Engine:**
- Java 17 with Spring Boot
- Custom DSA implementations
- RESTful API endpoints

**AI/ML:**
- Sentence-transformers (all-MiniLM-L6-v2)
- OpenRouter-compatible LLMs
- Multi-agent orchestration

## 📋 Prerequisites

- Python 3.13+
- Node.js 18+
- Java 17+
- PostgreSQL (or Supabase account)
- OpenRouter API key

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/Develosphere/credora.git
cd credora
```

### 2. Setup Python Environment
```bash
# Install uv (Python package manager)
pip install uv

# Sync dependencies
uv sync
```

### 3. Setup Frontend
```bash
cd credora-frontend
npm install
cd ..
```

### 4. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your credentials:
# - OPENROUTER_API_KEY (required)
# - DATABASE_URL (required)
# - Platform credentials (optional)
```

### 5. Setup Database
```bash
# Run migrations
uv run python run_migration.py
```

### 6. Build FAISS Index
```bash
# Build vector database from mock data
uv run python build_faiss_index.py
```

## 🚀 Running the Application

### Start Backend API Server
```bash
uv run python start_api.py
```
Server runs on: http://localhost:8000

### Start Frontend (in another terminal)
```bash
cd credora-frontend
npm run dev
```
Frontend runs on: http://localhost:3000

### Start Java FP&A Engine (optional)
```bash
cd credora-engine
mvn spring-boot:run
```
Engine runs on: http://localhost:8081

## 📖 Usage

### 1. Access the Application
Open http://localhost:3000 in your browser

### 2. Sign In
- Click "Sign In" and authenticate with Google
- Complete onboarding if first time

### 3. Connect Platforms (Optional)
- Go to Settings → Connected Platforms
- Click "Connect" for Shopify, Google Ads, or Meta Ads
- Follow OAuth flow to authorize

### 4. Chat with AI CFO
- Navigate to "AI CFO Chat" page
- Ask questions like:
  - "What products do we sell?"
  - "Show me recent orders"
  - "Which campaigns have the best ROAS?"
  - "Give me a business overview"
  - "What should I focus on to grow?"

### 5. Explore Features
- **Dashboard**: View key metrics and trends
- **Insights**: Get AI-powered recommendations
- **P&L Statement**: Financial performance analysis
- **Cash Forecast**: Future cash flow predictions
- **SKU Analysis**: Product profitability breakdown
- **Campaigns**: Ad performance tracking
- **Competitor**: Market research and analysis

## 🎯 RAG Query Examples

The RAG agent automatically retrieves data from the vector database:

**Product Queries:**
- "What wireless products do we have?"
- "Show me electronics in our catalog"
- "Find products with low inventory"

**Order Queries:**
- "Show me recent high-value orders"
- "What are our top customers?"
- "Find orders from this month"

**Campaign Queries:**
- "Which Google Ads campaigns have the best ROAS?"
- "Show me Meta Ads performance"
- "What are our most profitable campaigns?"

## ⚠️ Known Issues & Limitations

### 1. **OpenRouter Privacy Settings Required**
**Issue:** Free models require privacy settings enabled
**Error:** `No endpoints found matching your data policy`
**Fix:** 
- Go to https://openrouter.ai/settings/privacy
- Enable "Allow free model publication"
- OR use a paid model (update `credora/config.py`)

### 2. **RAG Agent Not Auto-Triggering**
**Issue:** CFO agent doesn't automatically handoff to RAG agent
**Workaround:** The agent has RAG capabilities but may need explicit routing
**Status:** Intent classification needs tuning

### 3. **Mock Data Only**
**Issue:** RAG database contains only mock data (35 documents)
**Impact:** Responses are based on sample data, not real business data
**Fix:** Connect real platforms or add more mock data to `mock_data/`

### 4. **Profile Picture Not Persisting**
**Issue:** Uploaded profile pictures require database migration
**Fix:** Run `uv run python run_migration.py` to add picture column

### 5. **Java Engine Optional**
**Issue:** FP&A engine features require Java service running
**Impact:** P&L, forecasting, and what-if features won't work without it
**Workaround:** Start Java engine separately or use Python-only features

### 6. **Platform Connection Requires OAuth**
**Issue:** Real platform data requires OAuth setup and credentials
**Impact:** Can't fetch live data without proper API credentials
**Workaround:** Use mock data for testing

### 7. **Session Management**
**Issue:** Sessions stored in memory, lost on server restart
**Impact:** Users need to re-authenticate after server restart
**Fix:** Implement Redis or database-backed sessions

### 8. **No Real-Time Sync**
**Issue:** Platform data sync is manual, not automatic
**Impact:** Data may be stale
**Workaround:** Manually trigger sync from Settings page

### 9. **Limited Error Handling**
**Issue:** Some errors not gracefully handled in UI
**Impact:** Generic error messages shown to users
**Status:** Needs improvement

### 10. **Embedding Model Download**
**Issue:** First run downloads ~90MB model
**Impact:** Initial FAISS index build takes 2-3 minutes
**Workaround:** Pre-build index with `build_faiss_index.py`

## 🔧 Configuration

### Model Configuration
Edit `credora/config.py` to change LLM model:

```python
# Free models (requires privacy settings)
model_name: str = "meta-llama/llama-3.2-3b-instruct:free"

# Paid models (requires credits)
# model_name: str = "google/gemini-flash-1.5"
# model_name: str = "anthropic/claude-3.5-sonnet"
```

### Database Configuration
Update `.env` with your database URL:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Platform Credentials
Add to `.env`:
```bash
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
META_CLIENT_ID=your_app_id
META_CLIENT_SECRET=your_app_secret
```

## 📁 Project Structure

```
credora/
├── credora/                    # Python backend
│   ├── agents/                 # AI agent implementations
│   │   ├── cfo.py             # Main CFO orchestrator
│   │   ├── rag.py             # RAG data retrieval agent
│   │   ├── analytics.py       # Analytics agent
│   │   ├── competitor.py      # Competitor analysis
│   │   └── insight.py         # Insight generation
│   ├── tools/                  # Agent tools
│   ├── services/               # Business logic
│   ├── database/               # Database models & migrations
│   ├── mcp_servers/            # Platform integrations
│   └── api_server.py          # FastAPI server
├── credora-frontend/           # Next.js frontend
│   ├── src/app/               # App routes
│   ├── src/components/        # React components
│   └── src/lib/               # Utilities & hooks
├── credora-engine/             # Java FP&A engine
│   └── src/main/java/         # Spring Boot application
├── mock_data/                  # Sample business data
│   ├── shopify/               # Products, orders
│   ├── google/                # Ad campaigns
│   └── meta/                  # Facebook ads
├── credora/data/              # Generated data
│   └── faiss_index/           # Vector database
├── start_api.py               # API server launcher
├── build_faiss_index.py       # FAISS index builder
└── run_migration.py           # Database migration runner
```

## 🧪 Testing

### Test RAG Retrieval
```bash
uv run python -c "from credora.agents.rag import search_products; print(search_products('wireless', k=2))"
```

### Test API Server
```bash
curl http://localhost:8000/health
```

### Test Frontend
Open http://localhost:3000 in browser

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

[Add your license here]

## 🆘 Support

For issues and questions:
- GitHub Issues: https://github.com/Develosphere/credora/issues
- Documentation: [Add docs link]

## 🎯 Roadmap

### Planned Features
- [ ] Real-time data synchronization
- [ ] Advanced analytics dashboards
- [ ] Multi-currency support
- [ ] Export reports (PDF, Excel)
- [ ] Email notifications
- [ ] Mobile app
- [ ] API rate limiting
- [ ] Webhook integrations
- [ ] Custom agent training
- [ ] Multi-tenant support

### Improvements Needed
- [ ] Better error handling in UI
- [ ] Improved RAG intent classification
- [ ] Redis-backed sessions
- [ ] Automated testing suite
- [ ] Performance optimization
- [ ] Documentation expansion
- [ ] Docker containerization
- [ ] CI/CD pipeline

## 📊 Performance

- **RAG Query Speed**: ~100-200ms
- **API Response Time**: ~500ms-2s (depending on LLM)
- **FAISS Index Size**: ~2MB (35 documents)
- **Memory Usage**: ~500MB (Python) + ~300MB (Node.js)

## 🔐 Security Notes

- Never commit `.env` files
- Rotate API keys regularly
- Use HTTPS in production
- Enable CORS only for trusted domains
- Implement rate limiting
- Validate all user inputs
- Use prepared statements for SQL

## 📞 Contact

- GitHub: https://github.com/Develosphere/credora
- Email: [Add contact email]

---

**Built with ❤️ using AI agents, RAG, and modern web technologies**
