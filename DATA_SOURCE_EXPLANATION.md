# Data Source Explanation: Database vs Mock Data

## Current System Architecture

The Credora system uses **TWO DIFFERENT DATA SOURCES** for different purposes:

### 1. Database (PostgreSQL) - PRIMARY SOURCE ✅
**Used by:** Chat API endpoint (`/chat/message`)

**What it loads:**
- ✅ Platform connections (Shopify, Google Ads, Meta Ads)
- ✅ P&L reports (revenue, costs, profit margins)
- ✅ Cash flow forecasts (runway, burn rate)
- ✅ Campaigns (from connected platforms)
- ✅ Transaction summaries (orders, ad spend)
- ✅ User data and session information

**Code location:** `credora/api_server.py` lines 2630-2750

**How it works:**
```python
# Get data from database
db = await get_db()
user_row = await db.fetchrow("SELECT id FROM users WHERE external_id = $1", user.id)

# Load P&L from database
pnl = await db.fetchrow("SELECT * FROM pnl_reports WHERE user_id = $1 ORDER BY calculated_at DESC LIMIT 1", user_uuid)

# Load campaigns from database
campaigns = await db.fetch("SELECT name, platform, spend, conversions FROM campaigns WHERE user_id = $1 ORDER BY spend DESC LIMIT 5", user_uuid)

# Load transactions from database
tx_summary = await db.fetchrow("SELECT COUNT(*) as tx_count, SUM(...) FROM transactions WHERE user_id = $1", user_uuid)
```

### 2. FAISS Vector Index (Mock Data) - SECONDARY SOURCE ⚠️
**Used by:** RAG system for semantic search

**What it loads:**
- Mock products from `mock_data/shopify/products.json`
- Mock orders from `mock_data/shopify/orders.json`
- Mock campaigns from `mock_data/google/campaigns.json` and `mock_data/meta/campaigns.json`

**Code location:** `credora/rag/data_loader.py`

**Purpose:**
- Provides semantic search capabilities
- Allows natural language queries like "show me products"
- Used for demonstration and testing

## How the Chat System Works

When you send a message to the chat:

```
User Query: "How is my Google Ads performing?"
    ↓
1. Load REAL data from DATABASE
   - Platform connections
   - P&L reports
   - Campaigns
   - Transactions
    ↓
2. (Optional) Search FAISS index for additional context
   - Only if query matches certain patterns
   - Provides supplementary information
    ↓
3. Combine database data + RAG results
    ↓
4. Send to AI agent for analysis
    ↓
5. Return formatted response
```

## What You're Currently Using

**✅ You ARE using database data!**

The chat endpoint loads:
- Real platform connections from your database
- Real P&L data from your database
- Real campaigns from your database
- Real transactions from your database

**⚠️ The FAISS index (mock data) is OPTIONAL**

The RAG system with mock data is only used for:
- Semantic search demonstrations
- Testing the vector search functionality
- Providing example data when database is empty

## How to Verify You're Using Database Data

1. **Check your database:**
```sql
SELECT * FROM platform_connections;
SELECT * FROM pnl_reports;
SELECT * FROM campaigns;
SELECT * FROM transactions;
```

2. **If you have data in these tables**, the chat will use it!

3. **If tables are empty**, you'll see:
```
Connected Platforms:
• No platforms connected yet.
• User needs to connect Shopify, Meta Ads, or Google Ads from the Settings page to see real data.
```

## Do You Need the Mock Data?

**NO!** You don't need mock data if:
- ✅ You have real data in your database
- ✅ Users connect their platforms (Shopify, Google Ads, Meta Ads)
- ✅ Data sync runs successfully

**The mock data is only useful for:**
- Testing the RAG semantic search
- Demonstrations without real platform connections
- Development and debugging

## How to Use ONLY Database Data

The system already does this! Just ensure:

1. **Users connect their platforms:**
   - Go to Settings → Connect Platforms
   - Authorize Shopify, Google Ads, Meta Ads

2. **Data sync runs:**
   - Platforms sync data to database
   - P&L calculations run
   - Campaigns are imported

3. **Chat queries work:**
   - "Show me my campaigns" → Loads from `campaigns` table
   - "What's my P&L?" → Loads from `pnl_reports` table
   - "How much did I spend?" → Loads from `transactions` table

## Summary

✅ **You're already using database data!**
- The chat endpoint loads from PostgreSQL
- Platform connections, P&L, campaigns, transactions all come from DB
- Mock data is only used for RAG semantic search (optional feature)

❌ **You DON'T need to load mock data if:**
- You have real data in your database
- Users have connected their platforms
- You don't need semantic search demonstrations

The system is designed to work with real database data by default!
