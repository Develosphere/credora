# How to Start Credora Servers

## Issue Found
The API server was running without the correct Python environment that has Playwright installed. This is why the browser wasn't launching for competitor analysis.

## Solution

### 1. Stop the Current API Server
If the API server is running, stop it first (Ctrl+C in the terminal where it's running).

### 2. Start API Server with Correct Environment

**Option A: Using uv (Recommended)**
```bash
uv run python start_api.py
```

**Option B: Using uv directly with uvicorn**
```bash
uv run uvicorn credora.api_server:app --host 0.0.0.0 --port 8000
```

### 3. Start Frontend (in a separate terminal)
```bash
cd credora-frontend
npm run dev
```

### 4. Start Java Engine (optional, in a separate terminal)
```bash
cd credora-engine
mvn spring-boot:run
```

## Verification

### Test API Server
```bash
curl http://localhost:8000/health
```

### Test Browser Functionality
```bash
uv run python test_browser_direct.py
```

### Test Competitor Analysis
```bash
uv run python test_competitor_simple.py
```

## What Was Fixed

1. **Installed Playwright**: Added playwright to the project dependencies
2. **Installed Chromium Browser**: Ran `playwright install chromium` to download the browser
3. **Environment Issue**: The API server needs to run with `uv run` to use the correct Python environment

## Expected Behavior

When you now:
1. Go to http://localhost:3000/competitor
2. Fill in the form
3. Check "Show browser during analysis (demo mode)"
4. Click "Start Analysis"

You should see:
- A browser window open on your screen
- The browser visiting each competitor website
- Real-time scraping happening visibly
- A completion page before the browser closes
- Results displayed in the frontend

## Troubleshooting

If the browser still doesn't launch:
1. Make sure you stopped the old API server
2. Start it again with `uv run python start_api.py`
3. Check the terminal for any error messages
4. Verify playwright is installed: `uv run python -c "from playwright.async_api import async_playwright; print('OK')"`
