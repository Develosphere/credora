#!/usr/bin/env python3
"""
Combined MCP Server for Credora.

Mounts all four FastMCP servers (Shopify, Meta, Google, Competitor) under a single FastAPI app.
This is the recommended approach for production deployment.

Usage:
    python -m credora.mcp_servers.fastmcp.combined_server
    
    # Or with uvicorn directly:
    uvicorn credora.mcp_servers.fastmcp.combined_server:app --reload --port 8001

Endpoints:
    /               - Health check and server info
    /shopify/*      - Shopify MCP server endpoints
    /meta/*         - Meta Ads MCP server endpoints  
    /google/*       - Google Ads MCP server endpoints
    /competitor/*   - Competitor Analysis MCP server endpoints
"""

import os
import logging
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("credora.mcp")

# Import the MCP servers
from credora.mcp_servers.fastmcp.shopify_server import shopify_mcp
from credora.mcp_servers.fastmcp.meta_server import meta_mcp
from credora.mcp_servers.fastmcp.google_server import google_mcp
from credora.mcp_servers.fastmcp.competitor_server import competitor_mcp

# =============================================================================
# Create Combined FastAPI App
# =============================================================================

app = FastAPI(
    title="Credora MCP Servers",
    description="""
Combined MCP (Model Context Protocol) servers for Credora CFO platform.

Provides data integration with:
- **Shopify** - E-commerce store data (orders, products, customers, analytics)
- **Meta Ads** - Facebook/Instagram advertising (campaigns, ad sets, ads, insights)
- **Google Ads** - Google advertising (campaigns, ad groups, keywords, search terms)
- **Competitor Analysis** - Real-time competitor research and pricing analysis

Each platform has its own OAuth flow and set of tools for data retrieval.
    """,
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log incoming request
        path = request.url.path
        method = request.method
        
        # Determine which platform based on path
        platform = "unknown"
        if path.startswith("/shopify"):
            platform = "SHOPIFY"
        elif path.startswith("/meta"):
            platform = "META"
        elif path.startswith("/google"):
            platform = "GOOGLE"
        elif path.startswith("/competitor"):
            platform = "COMPETITOR"
        
        # Log OAuth-related requests prominently
        if "oauth" in path.lower() or "callback" in path.lower() or "install" in path.lower():
            logger.info(f"🔐 [{platform}] OAuth: {method} {path}")
        elif "tool" in path.lower():
            logger.info(f"🔧 [{platform}] Tool call: {method} {path}")
        else:
            logger.info(f"📥 [{platform}] {method} {path}")
        
        response = await call_next(request)
        
        # Log response status
        status = response.status_code
        if status >= 400:
            logger.warning(f"⚠️  [{platform}] {method} {path} -> {status}")
        elif "oauth" in path.lower() or "callback" in path.lower():
            if status == 200:
                logger.info(f"✅ [{platform}] OAuth success: {path}")
        
        return response

app.add_middleware(RequestLoggingMiddleware)


# =============================================================================
# Root Endpoints
# =============================================================================

@app.get("/")
async def root():
    """Health check and server information."""
    return {
        "service": "Credora MCP Servers",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "servers": {
            "shopify": {
                "path": "/shopify",
                "install": "/shopify/shopify/install?shop=YOUR_STORE.myshopify.com",
                "status": "active"
            },
            "meta": {
                "path": "/meta",
                "install": "/meta/meta/install",
                "status": "active"
            },
            "google": {
                "path": "/google",
                "install": "/google/google/install",
                "status": "active"
            },
            "competitor": {
                "path": "/competitor",
                "status": "active"
            }
        },
        "documentation": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "servers": ["shopify", "meta", "google", "competitor"]
    }


# =============================================================================
# Mount MCP Servers
# =============================================================================

# Mount each MCP server under its own path prefix
# The .app attribute gives us the underlying FastAPI/Starlette app

# Note: FastMCP servers expose their FastAPI app via .app or similar
# We need to mount them as sub-applications

try:
    # Mount Shopify server
    app.mount("/shopify", shopify_mcp.http_app())
    print("✓ Shopify MCP server mounted at /shopify")
except Exception as e:
    print(f"⚠ Could not mount Shopify server: {e}")

try:
    # Mount Meta server
    app.mount("/meta", meta_mcp.http_app())
    print("✓ Meta Ads MCP server mounted at /meta")
except Exception as e:
    print(f"⚠ Could not mount Meta server: {e}")

try:
    # Mount Google server
    app.mount("/google", google_mcp.http_app())
    print("✓ Google Ads MCP server mounted at /google")
except Exception as e:
    print(f"⚠ Could not mount Google server: {e}")

try:
    # Mount Competitor server
    app.mount("/competitor", competitor_mcp.http_app())
    print("✓ Competitor Analysis MCP server mounted at /competitor")
except Exception as e:
    print(f"⚠ Could not mount Competitor server: {e}")


# =============================================================================
# Server Entry Point
# =============================================================================

def run_server(host: str = "0.0.0.0", port: int = 8001):
    """Run the combined MCP server."""
    import uvicorn
    print(f"\n{'='*60}")
    print("Credora MCP Servers")
    print(f"{'='*60}")
    print(f"Server running at http://{host}:{port}")
    print(f"\nEndpoints:")
    print(f"  - Shopify:     http://{host}:{port}/shopify")
    print(f"  - Meta Ads:    http://{host}:{port}/meta")
    print(f"  - Google Ads:  http://{host}:{port}/google")
    print(f"  - Competitor:  http://{host}:{port}/competitor")
    print(f"  - API Docs:    http://{host}:{port}/docs")
    print(f"{'='*60}\n")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run Credora Combined MCP Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8001, help="Port to listen on")
    
    args = parser.parse_args()
    run_server(args.host, args.port)
