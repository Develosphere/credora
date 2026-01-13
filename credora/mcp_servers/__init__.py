"""
MCP Servers for Credora CFO Agent.

This package contains FastMCP-based servers for integrating
with external advertising and e-commerce platforms:
- Shopify (port 8001)
- Meta Ads (port 8002)  
- Google Ads (port 8003)

Each server implements OAuth authentication and exposes
platform-specific tools for data retrieval.
"""

from credora.mcp_servers.fastmcp.token_manager import (
    TokenData,
    TokenManager,
    get_token_manager,
)

__all__ = [
    "TokenData",
    "TokenManager",
    "get_token_manager",
]
