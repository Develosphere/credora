"""Connection management tools for CFO Agent.

Requirements: 8.1, 8.2, 8.3, 8.4

These tools allow the CFO Agent to manage platform connections,
including listing, connecting, disconnecting, and checking health.

Updated to use FastMCP token manager for production-ready token storage.
"""

import os
import json
from typing import Optional
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from agents import function_tool

from credora.mcp_servers.fastmcp.token_manager import get_token_manager, TokenManager


# Connection manager singleton (uses token manager under the hood)
_connection_manager: Optional[TokenManager] = None


def get_connection_manager() -> TokenManager:
    """Get the connection manager singleton (alias for token manager)."""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = get_token_manager()
    return _connection_manager


def set_connection_manager(manager: TokenManager) -> None:
    """Set the connection manager singleton."""
    global _connection_manager
    _connection_manager = manager


# Supported platforms for connection
SUPPORTED_PLATFORMS = ["meta", "google", "shopify"]

# Default OAuth server configuration
OAUTH_SERVER_HOST = os.environ.get("OAUTH_SERVER_HOST", "http://localhost")
OAUTH_SERVER_PORT = int(os.environ.get("OAUTH_SERVER_PORT", "8000"))


def _run_async(coro):
    """Run an async coroutine from sync code, handling existing event loops."""
    import asyncio
    try:
        loop = asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, coro)
            return future.result()
    except RuntimeError:
        return asyncio.run(coro)


def _list_connected_platforms_impl(user_id: str) -> str:
    """Internal implementation of list_connected_platforms.
    
    Lists all connected platforms for a user with their status.
    
    Args:
        user_id: The unique identifier for the user
        
    Returns:
        JSON string containing list of connections or error message
    """
    if not user_id or not user_id.strip():
        return json.dumps({
            "error": "user_id is required and cannot be empty",
            "success": False
        })
    
    try:
        token_manager = get_token_manager()
        platforms = _run_async(token_manager.list_platforms(user_id.strip()))
        
        connections = []
        for platform in platforms:
            token_data = _run_async(token_manager.get_token(user_id.strip(), platform, auto_refresh=False))
            if token_data:
                connections.append({
                    "platform": platform,
                    "user_id": user_id,
                    "status": "expired" if token_data.is_expired() else "active",
                    "has_refresh_token": bool(token_data.refresh_token),
                    "expires_at": token_data.expires_at.isoformat() if token_data.expires_at else None,
                })
        
        return json.dumps({
            "connections": connections,
            "total_count": len(connections),
            "success": True
        })
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "success": False
        })


def _initiate_platform_connection_impl(
    user_id: str,
    platform: str,
    redirect_uri: Optional[str] = None,
    shop: Optional[str] = None
) -> str:
    """Internal implementation of initiate_platform_connection.
    
    NOTE: This tool should NOT be used by the AI agent.
    Platform connections must be initiated from the frontend Settings page.
    
    Args:
        user_id: The unique identifier for the user
        platform: The platform to connect (meta, google, shopify)
        redirect_uri: The OAuth callback URL (optional)
        shop: Shopify shop name (required for Shopify)
        
    Returns:
        JSON string with instructions to use Settings page
    """
    # AI agent should not generate OAuth URLs - direct to Settings page
    return json.dumps({
        "error": "Platform connections must be initiated from the Settings page in the Credora dashboard. Please go to Settings and click the Connect button for the platform you want to connect.",
        "platform": platform,
        "instructions": "Visit the Settings page in the sidebar and use the Connect buttons to securely connect your platforms.",
        "success": False
    })


def _disconnect_platform_impl(user_id: str, platform: str) -> str:
    """Internal implementation of disconnect_platform.
    
    Disconnects a platform by deleting stored tokens.
    
    Args:
        user_id: The unique identifier for the user
        platform: The platform to disconnect (meta, google, shopify)
        
    Returns:
        JSON string containing result or error message
    """
    if not user_id or not user_id.strip():
        return json.dumps({
            "error": "user_id is required and cannot be empty",
            "success": False
        })
    
    if not platform or not platform.strip():
        return json.dumps({
            "error": "platform is required and cannot be empty",
            "success": False
        })
    
    platform_lower = platform.lower().strip()
    if platform_lower not in SUPPORTED_PLATFORMS:
        return json.dumps({
            "error": f"Invalid platform '{platform}'. Supported platforms: {', '.join(SUPPORTED_PLATFORMS)}",
            "success": False
        })
    
    try:
        token_manager = get_token_manager()
        result = _run_async(token_manager.delete_token(user_id.strip(), platform_lower))
        
        if result:
            return json.dumps({
                "platform": platform_lower,
                "message": f"Successfully disconnected {platform_lower}",
                "success": True
            })
        else:
            return json.dumps({
                "platform": platform_lower,
                "message": f"No connection found for {platform_lower}",
                "success": True
            })
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "success": False
        })


def _check_platform_health_impl(user_id: str, platform: str) -> str:
    """Internal implementation of check_platform_health.
    
    Checks the health of a platform connection including token validity.
    
    Args:
        user_id: The unique identifier for the user
        platform: The platform to check (meta, google, shopify)
        
    Returns:
        JSON string containing health status or error message
    """
    if not user_id or not user_id.strip():
        return json.dumps({
            "error": "user_id is required and cannot be empty",
            "success": False
        })
    
    if not platform or not platform.strip():
        return json.dumps({
            "error": "platform is required and cannot be empty",
            "success": False
        })
    
    platform_lower = platform.lower().strip()
    if platform_lower not in SUPPORTED_PLATFORMS:
        return json.dumps({
            "error": f"Invalid platform '{platform}'. Supported platforms: {', '.join(SUPPORTED_PLATFORMS)}",
            "success": False
        })
    
    try:
        token_manager = get_token_manager()
        token_data = _run_async(token_manager.get_token(user_id.strip(), platform_lower, auto_refresh=True))
        
        if not token_data:
            return json.dumps({
                "platform": platform_lower,
                "is_healthy": False,
                "token_valid": False,
                "last_checked": datetime.now().isoformat(),
                "error_message": "No token found - platform not connected",
                "success": True
            })
        
        is_expired = token_data.is_expired()
        
        return json.dumps({
            "platform": platform_lower,
            "is_healthy": not is_expired,
            "token_valid": not is_expired,
            "last_checked": datetime.now().isoformat(),
            "expires_at": token_data.expires_at.isoformat() if token_data.expires_at else None,
            "error_message": "Token expired - re-authentication required" if is_expired else None,
            "success": True
        })
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "success": False
        })


# Decorated tools for agent use
@function_tool
def list_connected_platforms(user_id: str) -> str:
    """List all connected platforms for a user.
    
    Use this tool to see which advertising and e-commerce platforms
    the user has connected to Credora. Returns connection status
    and last sync time for each platform.
    
    Args:
        user_id: The unique identifier for the user
        
    Returns:
        JSON string containing:
        - connections: List of connected platforms with details
        - total_count: Number of connected platforms
        - success: Whether the operation succeeded
    """
    return _list_connected_platforms_impl(user_id)


@function_tool
def initiate_platform_connection(
    user_id: str,
    platform: str,
    shop: str = ""
) -> str:
    """Initiate OAuth connection for a platform.
    
    NOTE: This tool should NOT be used. Platform connections must be
    initiated from the Settings page in the Credora dashboard for security.
    
    Args:
        user_id: The unique identifier for the user
        platform: The platform to connect (meta, google, shopify)
        shop: Shopify shop name (required for Shopify only)
        
    Returns:
        JSON string with instructions to use Settings page
    """
    return _initiate_platform_connection_impl(user_id, platform, None, shop if shop else None)


@function_tool
def disconnect_platform(user_id: str, platform: str) -> str:
    """Disconnect a platform and revoke access.
    
    Use this tool to disconnect a user's platform account from Credora.
    This will delete all stored tokens and revoke access to the platform.
    
    Args:
        user_id: The unique identifier for the user
        platform: The platform to disconnect (meta, google, shopify)
        
    Returns:
        JSON string containing:
        - platform: The platform that was disconnected
        - message: Result message
        - success: Whether the operation succeeded
    """
    return _disconnect_platform_impl(user_id, platform)


@function_tool
def check_platform_health(user_id: str, platform: str) -> str:
    """Check the health of a platform connection.
    
    Use this tool to verify that a platform connection is healthy
    and the OAuth token is still valid. This helps identify
    connections that need re-authentication.
    
    Args:
        user_id: The unique identifier for the user
        platform: The platform to check (meta, google, shopify)
        
    Returns:
        JSON string containing:
        - platform: The platform checked
        - is_healthy: Whether the connection is healthy
        - token_valid: Whether the OAuth token is valid
        - last_checked: Timestamp of the health check
        - error_message: Error details if unhealthy
        - success: Whether the operation succeeded
    """
    return _check_platform_health_impl(user_id, platform)


__all__ = [
    "list_connected_platforms",
    "initiate_platform_connection",
    "disconnect_platform",
    "check_platform_health",
    "get_connection_manager",
    "set_connection_manager",
    "_list_connected_platforms_impl",
    "_initiate_platform_connection_impl",
    "_disconnect_platform_impl",
    "_check_platform_health_impl",
    "SUPPORTED_PLATFORMS",
]
