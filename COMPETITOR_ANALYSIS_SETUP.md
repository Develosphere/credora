# 🚀 Competitor Analysis Feature - Setup & Usage Guide

## Quick Start Commands

### 1. Clone & Setup (First Time Only)

```bash
# Clone the repository
git clone https://github.com/Develosphere/credora.git
cd credora

# Install Python dependencies with UV
uv sync

# Install Playwright browsers
.venv\Scripts\activate.bat
playwright install chromium

# Install frontend dependencies
cd credora-frontend
npm install
cd ..
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# OpenAI API Key (required for AI analysis)
OPENAI_API_KEY=your_openai_api_key_here

# Database (optional for basic testing)
DATABASE_URL=postgresql://user:password@localhost:5432/credora

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Run the Application

#### Option A: Run Both Backend & Frontend

**Terminal 1 - Backend API:**
```bash
.venv\Scripts\activate.bat
python start_api.py
```

**Terminal 2 - Frontend:**
```bash
cd credora-frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Competitor Page: http://localhost:3000/competitor

#### Option B: Test Backend Only (API)

```bash
# Activate environment
.venv\Scripts\activate.bat

# Start API server
python start_api.py

# In another terminal, run the test
.venv\Scripts\activate.bat
python test_competitor_auto.py
```

---

## 🎯 Using the Competitor Analysis Feature

### Method 1: Via Web Interface (Recommended)

1. **Start both backend and frontend** (see Option A above)
2. **Open browser**: http://localhost:3000/competitor
3. **Fill in the form**:
   - Business Type: e.g., "perfume", "restaurant", "clothing"
   - City: e.g., "Karachi", "Lahore", "Dubai"
   - Max Competitors: 3-10 (recommended: 3-5)
   - Generate Report: ✓ (checked)
   - Visible Browser: ✓ (to watch analysis in real-time)
4. **Click "Analyze Competitors"**
5. **Watch the analysis** happen in real-time
6. **View results** on the page and download the report

### Method 2: Via API (cURL)

```bash
curl -X POST http://localhost:8000/competitor/analyze \
  -H "Content-Type: application/json" \
  -d "{
    \"business_type\": \"perfume\",
    \"city\": \"Karachi\",
    \"max_competitors\": 3,
    \"generate_report\": true,
    \"visible_browser\": true
  }"
```


### Method 3: Via Python Test Script

```bash
# Activate environment
.venv\Scripts\activate.bat

# Run automated test
python test_competitor_auto.py
```

### Method 4: Via API Documentation (Swagger UI)

1. Start the backend: `python start_api.py`
2. Open: http://localhost:8000/docs
3. Find the `/competitor/analyze` endpoint
4. Click "Try it out"
5. Fill in the parameters
6. Click "Execute"

---

## 📋 API Parameters Explained

```json
{
  "business_type": "perfume",      // Type of business to analyze
  "city": "Karachi",               // Target city/location
  "max_competitors": 3,            // Number of competitors (1-10)
  "generate_report": true,         // Generate .txt report file
  "visible_browser": true          // Show browser window (false for headless)
}
```

**Parameters:**
- `business_type` (required): Type of business (e.g., "perfume", "restaurant")
- `city` (optional): Target city, default: "Karachi"
- `max_competitors` (optional): Number of competitors, default: 5
- `generate_report` (optional): Generate report file, default: true
- `visible_browser` (optional): Show browser window, default: false

---

## 📊 Expected Output

### API Response:
```json
{
  "status": "success",
  "message": "Competitor analysis completed for perfume in Karachi",
  "result": "Successfully analyzed 3 competitors...",
  "report_path": "api_competitor_report_20260121_174616.txt",
  "competitors_analyzed": 3
}
```


### Generated Report Contains:
- Executive summary with key metrics
- List of competitors with URLs
- Pricing and discount strategies
- Delivery and contact methods
- AI-powered strategic analysis
- Actionable recommendations
- Market positioning insights

---

## 🔧 Troubleshooting

### Issue: "Module not found" errors
```bash
# Reinstall dependencies
uv sync
```

### Issue: "Playwright browser not found"
```bash
.venv\Scripts\activate.bat
playwright install chromium
```

### Issue: "OpenAI API error"
```bash
# Check your .env file has valid OPENAI_API_KEY
# Get key from: https://platform.openai.com/api-keys
```

### Issue: "Port already in use"
```bash
# Backend (port 8000)
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Frontend (port 3000)
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

### Issue: Browser doesn't open in visible mode
- Make sure `visible_browser: true` is set
- Check if Chrome/Chromium is installed
- Try running: `playwright install chromium`

---

## 🧪 Testing Commands

### Run All Tests:
```bash
.venv\Scripts\activate.bat
python test_competitor_auto.py
```

### Test API Health:
```bash
curl http://localhost:8000/health
```

### Test Database Connection:
```bash
curl http://localhost:8000/debug/db
```


---

## 📁 File Locations

### Backend Files:
- API Endpoint: `credora/api_server.py` (line ~2687)
- Competitor Agent: `credora/agents/competitor.py`
- Browser Service: `credora/services/browser_service.py`
- MCP Server: `credora/mcp_servers/fastmcp/competitor_server.py`

### Frontend Files:
- Competitor Page: `credora-frontend/src/app/(dashboard)/competitor/page.tsx`
- API Client: `credora-frontend/src/lib/api/competitor.ts`
- React Hook: `credora-frontend/src/lib/hooks/useCompetitor.ts`

### Test Files:
- Automated Test: `test_competitor_auto.py`
- Manual Test: `test_competitor_api.py`

### Generated Reports:
- Location: Root directory
- Format: `api_competitor_report_YYYYMMDD_HHMMSS.txt`

---

## 🎓 Example Usage Scenarios

### Scenario 1: Analyze Perfume Shops in Karachi
```bash
# Via Python
python test_competitor_auto.py

# Via cURL
curl -X POST http://localhost:8000/competitor/analyze \
  -H "Content-Type: application/json" \
  -d '{"business_type":"perfume","city":"Karachi","max_competitors":3,"visible_browser":true}'
```

### Scenario 2: Analyze Restaurants in Lahore (Headless)
```bash
curl -X POST http://localhost:8000/competitor/analyze \
  -H "Content-Type: application/json" \
  -d '{"business_type":"restaurant","city":"Lahore","max_competitors":5,"visible_browser":false}'
```

### Scenario 3: Quick Analysis via Web UI
1. Go to http://localhost:3000/competitor
2. Enter: Business Type = "clothing", City = "Dubai"
3. Set Max Competitors = 3
4. Check "Visible Browser"
5. Click "Analyze Competitors"
6. Watch the magic happen! ✨

---

## 📞 Support

For issues or questions:
- Check documentation: `PROJECT_STATUS.md`, `TEST_RESULTS.md`
- Review test files: `test_competitor_auto.py`
- Check API logs in the terminal
- Visit: https://github.com/Develosphere/credora

---

**Last Updated**: January 21, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
