#!/usr/bin/env python3
"""
Unified MCP Server Runner for Credora.

Starts all three FastMCP servers (Shopify, Meta, Google) on different ports.

Usage:
    # Run all servers
    python -m credora.mcp_servers.fastmcp.run_servers
    
    # Run individual server
    python -m credora.mcp_servers.fastmcp.run_servers --server shopify
    python -m credora.mcp_servers.fastmcp.run_servers --server meta
    python -m credora.mcp_servers.fastmcp.run_servers --server google
    
    # Custom ports
    python -m credora.mcp_servers.fastmcp.run_servers --shopify-port 8001 --meta-port 8002 --google-port 8003
"""

import argparse
import asyncio
import sys
from typing import Optional

import uvicorn


# Default ports for each server
DEFAULT_PORTS = {
    "shopify": 8001,
    "meta": 8002,
    "google": 8003,
}


def run_shopify_server(port: int = 8001, host: str = "0.0.0.0"):
    """Run the Shopify MCP server."""
    from credora.mcp_servers.fastmcp.shopify_server import shopify_mcp
    print(f"Starting Shopify MCP Server on {host}:{port}")
    uvicorn.run(shopify_mcp.http_app(), host=host, port=port)


def run_meta_server(port: int = 8002, host: str = "0.0.0.0"):
    """Run the Meta Ads MCP server."""
    from credora.mcp_servers.fastmcp.meta_server import meta_mcp
    print(f"Starting Meta Ads MCP Server on {host}:{port}")
    uvicorn.run(meta_mcp.http_app(), host=host, port=port)


def run_google_server(port: int = 8003, host: str = "0.0.0.0"):
    """Run the Google Ads MCP server."""
    from credora.mcp_servers.fastmcp.google_server import google_mcp
    print(f"Starting Google Ads MCP Server on {host}:{port}")
    uvicorn.run(google_mcp.http_app(), host=host, port=port)


def main():
    parser = argparse.ArgumentParser(description="Run Credora MCP Servers")
    parser.add_argument(
        "--server",
        choices=["shopify", "meta", "google", "all"],
        default="all",
        help="Which server to run (default: all)"
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--shopify-port", type=int, default=8001, help="Shopify server port")
    parser.add_argument("--meta-port", type=int, default=8002, help="Meta server port")
    parser.add_argument("--google-port", type=int, default=8003, help="Google server port")
    
    args = parser.parse_args()
    
    if args.server == "shopify":
        run_shopify_server(args.shopify_port, args.host)
    elif args.server == "meta":
        run_meta_server(args.meta_port, args.host)
    elif args.server == "google":
        run_google_server(args.google_port, args.host)
    elif args.server == "all":
        print("To run all servers, use separate terminals or a process manager:")
        print(f"  Terminal 1: python -m credora.mcp_servers.fastmcp.run_servers --server shopify")
        print(f"  Terminal 2: python -m credora.mcp_servers.fastmcp.run_servers --server meta")
        print(f"  Terminal 3: python -m credora.mcp_servers.fastmcp.run_servers --server google")
        print("\nOr use the combined FastAPI app (recommended for production):")
        print("  python -m credora.mcp_servers.fastmcp.combined_server")
        sys.exit(0)


if __name__ == "__main__":
    main()
