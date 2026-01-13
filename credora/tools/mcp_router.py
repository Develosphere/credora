"""MCP Server Router for Data Fetcher.

Routes data requests to the appropriate FastMCP server based on platform.

Requirements: 1.4
"""

from typing import Any, Dict, List, Optional

import httpx

from credora.mcp_servers.fastmcp.token_manager import get_token_manager


# Combined server configuration
MCP_SERVER_BASE_URL = "http://localhost:8001"

# Platform path mapping (all on same port, different paths)
PLATFORM_PATH_MAPPING = {
    "shopify": "/shopify",
    "meta": "/meta",
    "google": "/google",
}

# Supported MCP platforms
MCP_PLATFORMS = {"meta", "google", "shopify"}


class MCPRouter:
    """Routes requests to appropriate FastMCP servers based on platform.
    
    Requirements: 1.4
    """
    
    def __init__(self, base_url: str = MCP_SERVER_BASE_URL):
        """Initialize the MCP router.
        
        Args:
            base_url: Base URL for combined FastMCP server
        """
        self._base_url = base_url
        self._token_manager = get_token_manager()
    
    def _get_server_url(self, platform: str) -> str:
        """Get the FastMCP server URL for a platform."""
        path = PLATFORM_PATH_MAPPING.get(platform.lower())
        if not path:
            raise ValueError(f"Unknown platform: {platform}")
        return f"{self._base_url}{path}"
    
    def is_mcp_platform(self, platform: str) -> bool:
        """Check if a platform is supported by MCP servers.
        
        Args:
            platform: Platform name to check
            
        Returns:
            True if platform has MCP server support
        """
        return platform.lower().strip() in MCP_PLATFORMS
    
    async def _call_mcp_tool(
        self,
        platform: str,
        tool_name: str,
        params: Dict[str, Any],
    ) -> Any:
        """Call a tool on a FastMCP server.
        
        Args:
            platform: Platform name
            tool_name: Name of the MCP tool to call
            params: Parameters for the tool
            
        Returns:
            Tool response data
        """
        server_url = self._get_server_url(platform)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # FastMCP tools are exposed via POST /tools/{tool_name}
            response = await client.post(
                f"{server_url}/tools/{tool_name}",
                json=params
            )
            response.raise_for_status()
            return response.json()
    
    async def fetch_campaigns(
        self,
        user_id: str,
        platform: str,
        account_id: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch campaigns from the appropriate FastMCP server.
        
        Args:
            user_id: User identifier
            platform: Platform name (meta, google)
            account_id: Account/customer ID
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            
        Returns:
            List of campaign data dictionaries
            
        Requirements: 1.4
        """
        platform_lower = platform.lower().strip()
        
        params = {
            "user_id": user_id,
            "date_from": date_from or "",
            "date_to": date_to or "",
        }
        
        if platform_lower == "meta":
            params["account_id"] = account_id
            result = await self._call_mcp_tool("meta", "get_campaigns", params)
        elif platform_lower == "google":
            params["customer_id"] = account_id
            result = await self._call_mcp_tool("google", "get_campaigns", params)
        else:
            raise ValueError(f"Campaign data not available for platform: {platform}")
        
        return result.get("campaigns", [])
    

    async def fetch_orders(
        self,
        user_id: str,
        platform: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        status: str = "any",
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Fetch orders from Shopify FastMCP server.
        
        Args:
            user_id: User identifier
            platform: Platform name (shopify)
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            status: Order status filter
            limit: Maximum orders to return
            
        Returns:
            List of order data dictionaries
            
        Requirements: 1.4
        """
        platform_lower = platform.lower().strip()
        
        if platform_lower == "shopify":
            params = {
                "user_id": user_id,
                "date_from": date_from or "",
                "date_to": date_to or "",
                "status": status,
                "limit": limit,
            }
            result = await self._call_mcp_tool("shopify", "get_orders", params)
            return result.get("orders", [])
        else:
            raise ValueError(f"Order data not available for platform: {platform}")
    
    async def fetch_products(
        self,
        user_id: str,
        platform: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Fetch products from Shopify FastMCP server.
        
        Args:
            user_id: User identifier
            platform: Platform name (shopify)
            limit: Maximum products to return
            
        Returns:
            List of product data dictionaries
            
        Requirements: 1.4
        """
        platform_lower = platform.lower().strip()
        
        if platform_lower == "shopify":
            params = {
                "user_id": user_id,
                "limit": limit,
            }
            result = await self._call_mcp_tool("shopify", "get_products", params)
            return result.get("products", [])
        else:
            raise ValueError(f"Product data not available for platform: {platform}")
    
    async def fetch_customers(
        self,
        user_id: str,
        platform: str,
        segment: str = "all",
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Fetch customers from Shopify FastMCP server.
        
        Args:
            user_id: User identifier
            platform: Platform name (shopify)
            segment: Customer segment filter
            limit: Maximum customers to return
            
        Returns:
            List of customer data dictionaries
            
        Requirements: 1.4
        """
        platform_lower = platform.lower().strip()
        
        if platform_lower == "shopify":
            params = {
                "user_id": user_id,
                "segment": segment,
                "limit": limit,
            }
            result = await self._call_mcp_tool("shopify", "get_customers", params)
            return result.get("customers", [])
        else:
            raise ValueError(f"Customer data not available for platform: {platform}")
    
    async def fetch_analytics(
        self,
        user_id: str,
        platform: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetch analytics from Shopify FastMCP server.
        
        Args:
            user_id: User identifier
            platform: Platform name (shopify)
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            
        Returns:
            Analytics data dictionary
            
        Requirements: 1.4
        """
        platform_lower = platform.lower().strip()
        
        if platform_lower == "shopify":
            params = {
                "user_id": user_id,
                "date_from": date_from or "",
                "date_to": date_to or "",
            }
            return await self._call_mcp_tool("shopify", "get_sales_analytics", params)
        else:
            raise ValueError(f"Analytics data not available for platform: {platform}")
    
    async def fetch_ad_accounts(
        self,
        user_id: str,
        platform: str,
    ) -> List[Dict[str, Any]]:
        """Fetch ad accounts from Meta or Google FastMCP server.
        
        Args:
            user_id: User identifier
            platform: Platform name (meta, google)
            
        Returns:
            List of ad account/customer data dictionaries
            
        Requirements: 1.4
        """
        platform_lower = platform.lower().strip()
        
        params = {"user_id": user_id}
        
        if platform_lower == "meta":
            result = await self._call_mcp_tool("meta", "list_ad_accounts", params)
            return result.get("accounts", [])
        elif platform_lower == "google":
            result = await self._call_mcp_tool("google", "list_accessible_customers", params)
            return result.get("customers", [])
        else:
            raise ValueError(f"Ad account data not available for platform: {platform}")


# Module-level router instance
_mcp_router: Optional[MCPRouter] = None


def get_mcp_router() -> MCPRouter:
    """Get the global MCP router instance.
    
    Returns:
        MCPRouter instance
    """
    global _mcp_router
    if _mcp_router is None:
        _mcp_router = MCPRouter()
    return _mcp_router


def set_mcp_router(router: MCPRouter) -> None:
    """Set the global MCP router instance (for testing).
    
    Args:
        router: MCPRouter instance to use
    """
    global _mcp_router
    _mcp_router = router


__all__ = [
    "MCPRouter",
    "MCP_PLATFORMS",
    "MCP_SERVER_BASE_URL",
    "PLATFORM_PATH_MAPPING",
    "get_mcp_router",
    "set_mcp_router",
]
