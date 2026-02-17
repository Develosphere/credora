@echo off
echo Starting Credora Platform...

:: Start Backend
start "Credora Backend API" cmd /k "uv run python start_api.py"

:: Start Frontend
:: Using npm run dev for development mode (hot reloading)
start "Credora Frontend" cmd /k "cd credora-frontend && npm run dev"

:: Start MCP Servers
start "Credora MCP Servers" cmd /k "uv run python -m credora.mcp_servers.fastmcp.combined_server"

:: Start Java Engine
start "Credora Java Engine" cmd /k "cd credora-engine && mvn spring-boot:run"

echo All services are starting in separate windows.
