# ⚡ Quick Start - Competitor Analysis

## 🚀 Run in 3 Steps

### Step 1: Setup (First Time Only)
```bash
git clone https://github.com/Develosphere/credora.git
cd credora
uv sync
.venv\Scripts\activate.bat
playwright install chromium
cd credora-frontend && npm install && cd ..
```

### Step 2: Start Servers
```bash
# Terminal 1 - Backend
.venv\Scripts\activate.bat
python start_api.py

# Terminal 2 - Frontend
cd credora-frontend
npm run dev
```

### Step 3: Use the Feature
Open: http://localhost:3000/competitor

---

## 🎯 Quick Test (Backend Only)
```bash
.venv\Scripts\activate.bat
python start_api.py
# In another terminal:
python test_competitor_auto.py
```

---

## 📋 Essential Commands

### Start Backend:
```bash
.venv\Scripts\activate.bat
python start_api.py
```

### Start Frontend:
```bash
cd credora-frontend
npm run dev
```

### Run Test:
```bash
python test_competitor_auto.py
```

### API Test (cURL):
```bash
curl -X POST http://localhost:8000/competitor/analyze \
  -H "Content-Type: application/json" \
  -d '{"business_type":"perfume","city":"Karachi","max_competitors":3,"visible_browser":true}'
```

---

## 🌐 Access URLs
- **Frontend**: http://localhost:3000
- **Competitor Page**: http://localhost:3000/competitor
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔑 Required Environment Variable
Create `.env` file:
```
OPENAI_API_KEY=your_key_here
```

---

For detailed instructions, see: `COMPETITOR_ANALYSIS_SETUP.md`
