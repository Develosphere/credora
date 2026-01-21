@echo off
echo ========================================
echo Starting Credora API Server
echo ========================================
echo.
echo Using UV to ensure correct Python environment...
echo.
uv run python start_api.py
