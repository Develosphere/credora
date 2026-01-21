@echo off
echo ========================================
echo Credora System Test
echo ========================================
echo.

echo [1/4] Testing Playwright Installation...
uv run python -c "from playwright.async_api import async_playwright; print('✅ Playwright OK')"
if errorlevel 1 (
    echo ❌ Playwright not installed
    echo Run: uv add playwright
    echo Then: uv run python -m playwright install chromium
    pause
    exit /b 1
)
echo.

echo [2/4] Testing API Server...
curl -s http://localhost:8000/health > nul 2>&1
if errorlevel 1 (
    echo ❌ API Server not running
    echo Start it with: uv run python start_api.py
    pause
    exit /b 1
) else (
    echo ✅ API Server is running
)
echo.

echo [3/4] Testing Browser Launch...
echo This will open a browser window for 5 seconds...
uv run python test_browser_direct.py
if errorlevel 1 (
    echo ❌ Browser test failed
    pause
    exit /b 1
)
echo.

echo [4/4] Testing Competitor Analysis...
echo This will run a full competitor analysis with visible browser...
echo Press Ctrl+C to skip, or wait to continue...
timeout /t 5
uv run python test_competitor_simple.py
echo.

echo ========================================
echo All Tests Complete!
echo ========================================
echo.
echo You can now use the competitor page at:
echo http://localhost:3000/competitor
echo.
pause
