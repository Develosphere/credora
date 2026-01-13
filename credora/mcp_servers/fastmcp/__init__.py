"""
FastMCP-based MCP Servers for Credora.

Production-ready MCP servers using FastMCP framework for:
- Shopify (e-commerce data)
- Meta Ads (Facebook/Instagram advertising)
- Google Ads (Google advertising)

Each server provides OAuth handling and data fetching tools.

Usage:
    # Import individual servers
    from credora.mcp_servers.fastmcp import shopify_mcp, meta_mcp, google_mcp
    
    # Run individual server
    shopify_mcp.run()
    
    # Or use the combined server
    from credora.mcp_servers.fastmcp.combined_server import app
"""

from credora.mcp_servers.fastmcp.token_manager import (
    TokenManager,
    TokenData,
    get_token_manager,
)
from credora.mcp_servers.fastmcp.shopify_server import shopify_mcp
from credora.mcp_servers.fastmcp.meta_server import meta_mcp
from credora.mcp_servers.fastmcp.google_server import google_mcp

__all__ = [
    "shopify_mcp",
    "meta_mcp", 
    "google_mcp",
    "TokenManager",
    "TokenData",
    "get_token_manager",
]
