"""
Shopify FastMCP Server - Production Ready.

Complete MCP server for Shopify e-commerce integration with:
- OAuth 2.0 authentication flow
- Store information retrieval
- Orders, products, customers data
- Sales analytics and dashboard
- Inventory management

API Version: 2024-10
"""

import os
import asyncio
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

import httpx
from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from fastmcp import FastMCP
from dotenv import load_dotenv

from credora.mcp_servers.fastmcp.token_manager import (
    TokenManager, TokenData, get_token_manager
)

load_dotenv()

# =============================================================================
# Configuration
# =============================================================================

SHOPIFY_CLIENT_ID = os.getenv("SHOPIFY_CLIENT_ID", "")
SHOPIFY_CLIENT_SECRET = os.getenv("SHOPIFY_CLIENT_SECRET", "")
SHOPIFY_REDIRECT_URI = os.getenv("SHOPIFY_REDIRECT_URI", "http://localhost:8000/oauth/callback/shopify")
SHOPIFY_API_VERSION = "2024-10"

# Required scopes for Credora CFO functionality
SHOPIFY_SCOPES = "read_orders,read_products,read_customers,read_analytics,read_inventory"

# Pending OAuth states for CSRF protection
_pending_states: Dict[str, Dict[str, Any]] = {}

# =============================================================================
# Initialize FastMCP Server
# =============================================================================

shopify_mcp = FastMCP(
    name="Credora Shopify Server",
    instructions="Production MCP server for Shopify e-commerce data integration. Provides tools for fetching orders, products, customers, and analytics from Shopify stores."
)

# =============================================================================
# HTTP Client Context Manager
# =============================================================================

@asynccontextmanager
async def get_shopify_client(shop: str, access_token: str):
    """Async context manager for authenticated Shopify API client.
    
    Args:
        shop: Shop domain (e.g., mystore.myshopify.com)
        access_token: OAuth access token
        
    Yields:
        Configured httpx.AsyncClient
    """
    # Normalize shop domain
    shop = shop.replace("https://", "").replace("http://", "").rstrip("/")
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com"
    
    base_url = f"https://{shop}/admin/api/{SHOPIFY_API_VERSION}"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(
        base_url=base_url,
        headers=headers,
        timeout=30.0
    ) as client:
        yield client

# =============================================================================
# OAuth Routes
# =============================================================================

@shopify_mcp.custom_route("/", methods=["GET"])
async def root(request: Request):
    """Root endpoint - redirect to install if shop provided."""
    shop = request.query_params.get("shop")
    if shop:
        return RedirectResponse(f"/shopify/install?shop={shop}")
    return JSONResponse({
        "server": "Credora Shopify MCP Server",
        "status": "running",
        "version": SHOPIFY_API_VERSION,
        "docs": "Use /shopify/install?shop=yourstore to begin OAuth flow"
    })


@shopify_mcp.custom_route("/shopify/install", methods=["GET"])
async def install(request: Request):
    """Initiate Shopify OAuth installation flow.
    
    Query params:
        shop: Shopify store domain (required)
        user_id: User identifier for token storage (optional)
    """
    shop = request.query_params.get("shop")
    user_id = request.query_params.get("user_id", "default")
    
    if not shop:
        raise HTTPException(status_code=400, detail="Missing 'shop' parameter")
    
    if not SHOPIFY_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Shopify OAuth not configured")
    
    # Normalize shop domain
    shop = shop.replace("https://", "").replace("http://", "").rstrip("/")
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com"
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    _pending_states[state] = {
        "shop": shop,
        "user_id": user_id,
        "created_at": datetime.now(),
    }
    
    # Build OAuth URL
    install_url = (
        f"https://{shop}/admin/oauth/authorize?"
        f"client_id={SHOPIFY_CLIENT_ID}&"
        f"scope={SHOPIFY_SCOPES}&"
        f"redirect_uri={SHOPIFY_REDIRECT_URI}&"
        f"state={state}"
    )
    
    return RedirectResponse(install_url)


@shopify_mcp.custom_route("/oauth/callback/shopify", methods=["GET"])
async def oauth_callback(request: Request):
    """Handle Shopify OAuth callback.
    
    Exchanges authorization code for access token and stores it.
    """
    print(f"🔐 [SHOPIFY] OAuth callback received")
    
    shop = request.query_params.get("shop")
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    hmac_param = request.query_params.get("hmac")
    
    if not shop or not code or not state:
        print(f"❌ [SHOPIFY] Missing OAuth parameters")
        return _error_html("Missing required OAuth parameters")
    
    print(f"🔄 [SHOPIFY] Processing callback for shop: {shop}")
    
    # Verify state
    state_data = _pending_states.pop(state, None)
    if not state_data:
        print(f"❌ [SHOPIFY] Invalid or expired state")
        return _error_html("Invalid or expired OAuth state. Please try again.")
    
    # Check state expiry (10 minutes)
    if datetime.now() - state_data["created_at"] > timedelta(minutes=10):
        print(f"❌ [SHOPIFY] OAuth session expired")
        return _error_html("OAuth session expired. Please try again.")
    
    user_id = state_data.get("user_id", "default")
    print(f"🔄 [SHOPIFY] Exchanging code for token (user: {user_id})")
    
    # Exchange code for access token
    token_url = f"https://{shop}/admin/oauth/access_token"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                token_url,
                json={
                    "client_id": SHOPIFY_CLIENT_ID,
                    "client_secret": SHOPIFY_CLIENT_SECRET,
                    "code": code,
                }
            )
            
            if response.status_code != 200:
                print(f"❌ [SHOPIFY] Token exchange failed: {response.status_code}")
                return _error_html(f"Token exchange failed: {response.text}")
            
            data = response.json()
            access_token = data.get("access_token")
            
            if not access_token:
                print(f"❌ [SHOPIFY] No access token in response")
                return _error_html("No access token in response")
            
            # Store token
            token_manager = get_token_manager()
            await token_manager.store_token(
                user_id=user_id,
                platform="shopify",
                token_data=TokenData(
                    access_token=access_token,
                    refresh_token=access_token,  # Shopify tokens don't refresh
                    expires_at=datetime.now() + timedelta(days=365),  # Long expiry
                    metadata={"shop": shop}
                )
            )
            
            print(f"✅ [SHOPIFY] Successfully connected shop: {shop} for user: {user_id}")
            return _success_html("Shopify", shop)
            
        except Exception as e:
            print(f"❌ [SHOPIFY] OAuth error: {str(e)}")
            return _error_html(f"OAuth error: {str(e)}")

# =============================================================================
# MCP Tools - Dashboard & Analytics
# =============================================================================

@shopify_mcp.tool
async def get_store_dashboard(shop: str, user_id: str = "default") -> Dict[str, Any]:
    """Get comprehensive store dashboard with key metrics.
    
    Fetches order count, product count, customer count, and recent sales
    in parallel for optimal performance.
    
    Args:
        shop: Shopify store domain
        user_id: User identifier for authentication
        
    Returns:
        Dashboard data with store metrics
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "shopify")
    
    if not token_data:
        return {"error": "Not authenticated. Please connect Shopify first."}
    
    # Use stored shop if not provided
    if not shop and token_data.metadata:
        shop = token_data.metadata.get("shop", "")
    
    if not shop:
        return {"error": "Shop domain required"}
    
    async with get_shopify_client(shop, token_data.access_token) as client:
        async def fetch_order_count():
            resp = await client.get("/orders/count.json", params={"status": "any"})
            resp.raise_for_status()
            return resp.json().get("count", 0)
        
        async def fetch_product_count():
            resp = await client.get("/products/count.json")
            resp.raise_for_status()
            return resp.json().get("count", 0)
        
        async def fetch_customer_count():
            resp = await client.get("/customers/count.json")
            resp.raise_for_status()
            return resp.json().get("count", 0)
        
        async def fetch_recent_revenue():
            resp = await client.get(
                "/orders.json",
                params={"status": "any", "limit": 50, "fields": "total_price,financial_status"}
            )
            resp.raise_for_status()
            orders = resp.json().get("orders", [])
            # Only count paid orders
            paid_orders = [o for o in orders if o.get("financial_status") in ["paid", "partially_paid"]]
            return sum(float(o.get("total_price", 0)) for o in paid_orders)
        
        async def fetch_store_info():
            resp = await client.get("/shop.json")
            resp.raise_for_status()
            return resp.json().get("shop", {})
        
        try:
            results = await asyncio.gather(
                fetch_order_count(),
                fetch_product_count(),
                fetch_customer_count(),
                fetch_recent_revenue(),
                fetch_store_info(),
                return_exceptions=True
            )
            
            order_count = results[0] if not isinstance(results[0], Exception) else 0
            product_count = results[1] if not isinstance(results[1], Exception) else 0
            customer_count = results[2] if not isinstance(results[2], Exception) else 0
            recent_revenue = results[3] if not isinstance(results[3], Exception) else 0
            store_info = results[4] if not isinstance(results[4], Exception) else {}
            
            return {
                "dashboard": {
                    "store_name": store_info.get("name", shop),
                    "store_domain": store_info.get("domain", shop),
                    "currency": store_info.get("currency", "USD"),
                    "total_orders": order_count,
                    "total_products": product_count,
                    "total_customers": customer_count,
                    "recent_revenue_last_50_orders": round(recent_revenue, 2),
                    "store_email": store_info.get("email", ""),
                    "plan_name": store_info.get("plan_name", ""),
                }
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Shopify API error: {e.response.status_code}"}
        except Exception as e:
            return {"error": f"Unexpected error: {str(e)}"}

# =============================================================================
# MCP Tools - Orders
# =============================================================================

@shopify_mcp.tool
async def get_orders(
    shop: str,
    user_id: str = "default",
    status: str = "any",
    limit: int = 50,
    date_from: str = "",
    date_to: str = ""
) -> Dict[str, Any]:
    """Fetch orders with filtering options.
    
    Args:
        shop: Shopify store domain
        user_id: User identifier
        status: Order status filter (any, open, closed, cancelled)
        limit: Maximum orders to return (max 250)
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        
    Returns:
        List of orders with line items and customer info
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "shopify")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not shop and token_data.metadata:
        shop = token_data.metadata.get("shop", "")
    
    async with get_shopify_client(shop, token_data.access_token) as client:
        params = {
            "status": status,
            "limit": min(limit, 250),
        }
        
        if date_from:
            params["created_at_min"] = f"{date_from}T00:00:00Z"
        if date_to:
            params["created_at_max"] = f"{date_to}T23:59:59Z"
        
        try:
            response = await client.get("/orders.json", params=params)
            response.raise_for_status()
            orders = response.json().get("orders", [])
            
            # Simplify order data for analysis
            simplified = []
            for order in orders:
                customer = order.get("customer", {})
                customer_name = "Guest"
                if customer:
                    customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
                
                simplified.append({
                    "id": order.get("id"),
                    "order_number": order.get("name"),
                    "created_at": order.get("created_at"),
                    "total_price": float(order.get("total_price", 0)),
                    "subtotal_price": float(order.get("subtotal_price", 0)),
                    "total_tax": float(order.get("total_tax", 0)),
                    "total_discounts": float(order.get("total_discounts", 0)),
                    "currency": order.get("currency"),
                    "financial_status": order.get("financial_status"),
                    "fulfillment_status": order.get("fulfillment_status"),
                    "customer_name": customer_name,
                    "customer_email": customer.get("email", ""),
                    "line_items_count": len(order.get("line_items", [])),
                    "line_items": [
                        {
                            "title": item.get("title"),
                            "quantity": item.get("quantity"),
                            "price": float(item.get("price", 0)),
                            "sku": item.get("sku"),
                        }
                        for item in order.get("line_items", [])[:10]  # Limit line items
                    ]
                })
            
            return {
                "orders": simplified,
                "count": len(simplified),
                "filters": {"status": status, "date_from": date_from, "date_to": date_to}
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"API error: {e.response.status_code} - {e.response.text}"}


# =============================================================================
# MCP Tools - Products
# =============================================================================

@shopify_mcp.tool
async def get_products(
    shop: str,
    user_id: str = "default",
    limit: int = 50,
    status: str = "active",
    search_query: str = ""
) -> Dict[str, Any]:
    """Fetch products with inventory information.
    
    Args:
        shop: Shopify store domain
        user_id: User identifier
        limit: Maximum products to return (max 250)
        status: Product status (active, archived, draft)
        search_query: Search products by title
        
    Returns:
        List of products with variants and inventory
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "shopify")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not shop and token_data.metadata:
        shop = token_data.metadata.get("shop", "")
    
    async with get_shopify_client(shop, token_data.access_token) as client:
        params = {
            "limit": min(limit, 250),
            "status": status,
        }
        
        try:
            response = await client.get("/products.json", params=params)
            response.raise_for_status()
            products = response.json().get("products", [])
            
            # Filter by search query if provided
            if search_query:
                query_lower = search_query.lower()
                products = [
                    p for p in products
                    if query_lower in p.get("title", "").lower()
                    or query_lower in p.get("body_html", "").lower()
                ]
            
            # Simplify product data
            simplified = []
            for product in products:
                variants = product.get("variants", [])
                first_variant = variants[0] if variants else {}
                
                total_inventory = sum(
                    v.get("inventory_quantity", 0) for v in variants
                )
                
                simplified.append({
                    "id": product.get("id"),
                    "title": product.get("title"),
                    "handle": product.get("handle"),
                    "status": product.get("status"),
                    "product_type": product.get("product_type"),
                    "vendor": product.get("vendor"),
                    "created_at": product.get("created_at"),
                    "updated_at": product.get("updated_at"),
                    "price": float(first_variant.get("price", 0)),
                    "compare_at_price": float(first_variant.get("compare_at_price", 0) or 0),
                    "sku": first_variant.get("sku"),
                    "total_inventory": total_inventory,
                    "variants_count": len(variants),
                    "tags": product.get("tags", "").split(", ") if product.get("tags") else [],
                })
            
            return {
                "products": simplified,
                "count": len(simplified),
                "filters": {"status": status, "search": search_query}
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"API error: {e.response.status_code}"}


@shopify_mcp.tool
async def get_product_details(
    shop: str,
    product_id: int,
    user_id: str = "default"
) -> Dict[str, Any]:
    """Get detailed information for a specific product.
    
    Args:
        shop: Shopify store domain
        product_id: Product ID
        user_id: User identifier
        
    Returns:
        Complete product details with all variants
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "shopify")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not shop and token_data.metadata:
        shop = token_data.metadata.get("shop", "")
    
    async with get_shopify_client(shop, token_data.access_token) as client:
        try:
            response = await client.get(f"/products/{product_id}.json")
            response.raise_for_status()
            product = response.json().get("product", {})
            
            return {
                "product": {
                    "id": product.get("id"),
                    "title": product.get("title"),
                    "description": product.get("body_html"),
                    "handle": product.get("handle"),
                    "status": product.get("status"),
                    "product_type": product.get("product_type"),
                    "vendor": product.get("vendor"),
                    "tags": product.get("tags"),
                    "created_at": product.get("created_at"),
                    "updated_at": product.get("updated_at"),
                    "variants": [
                        {
                            "id": v.get("id"),
                            "title": v.get("title"),
                            "price": float(v.get("price", 0)),
                            "compare_at_price": float(v.get("compare_at_price", 0) or 0),
                            "sku": v.get("sku"),
                            "inventory_quantity": v.get("inventory_quantity", 0),
                            "weight": v.get("weight"),
                            "weight_unit": v.get("weight_unit"),
                        }
                        for v in product.get("variants", [])
                    ],
                    "images_count": len(product.get("images", [])),
                }
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Customers
# =============================================================================

@shopify_mcp.tool
async def get_customers(
    shop: str,
    user_id: str = "default",
    limit: int = 50,
    segment: str = "all"
) -> Dict[str, Any]:
    """Fetch customers with segmentation.
    
    Args:
        shop: Shopify store domain
        user_id: User identifier
        limit: Maximum customers to return (max 250)
        segment: Customer segment (all, repeat, new, vip)
            - repeat: Customers with 2+ orders
            - new: Customers with 1 order
            - vip: Customers with $1000+ total spend
        
    Returns:
        List of customers with order history summary
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "shopify")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not shop and token_data.metadata:
        shop = token_data.metadata.get("shop", "")
    
    async with get_shopify_client(shop, token_data.access_token) as client:
        try:
            response = await client.get(
                "/customers.json",
                params={"limit": min(limit, 250)}
            )
            response.raise_for_status()
            customers = response.json().get("customers", [])
            
            # Apply segmentation filter
            filtered = []
            for customer in customers:
                orders_count = customer.get("orders_count", 0)
                total_spent = float(customer.get("total_spent", 0))
                
                if segment == "repeat" and orders_count < 2:
                    continue
                elif segment == "new" and orders_count != 1:
                    continue
                elif segment == "vip" and total_spent < 1000:
                    continue
                
                filtered.append({
                    "id": customer.get("id"),
                    "email": customer.get("email"),
                    "first_name": customer.get("first_name"),
                    "last_name": customer.get("last_name"),
                    "orders_count": orders_count,
                    "total_spent": total_spent,
                    "currency": customer.get("currency"),
                    "created_at": customer.get("created_at"),
                    "last_order_at": customer.get("last_order_name"),
                    "accepts_marketing": customer.get("accepts_marketing"),
                    "tags": customer.get("tags", "").split(", ") if customer.get("tags") else [],
                    "verified_email": customer.get("verified_email"),
                })
            
            return {
                "customers": filtered,
                "count": len(filtered),
                "segment": segment
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Analytics
# =============================================================================

@shopify_mcp.tool
async def get_sales_analytics(
    shop: str,
    user_id: str = "default",
    date_from: str = "",
    date_to: str = ""
) -> Dict[str, Any]:
    """Calculate sales analytics from order data.
    
    Args:
        shop: Shopify store domain
        user_id: User identifier
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        
    Returns:
        Sales analytics including revenue, AOV, top products
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "shopify")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not shop and token_data.metadata:
        shop = token_data.metadata.get("shop", "")
    
    async with get_shopify_client(shop, token_data.access_token) as client:
        params = {"status": "any", "limit": 250}
        
        if date_from:
            params["created_at_min"] = f"{date_from}T00:00:00Z"
        if date_to:
            params["created_at_max"] = f"{date_to}T23:59:59Z"
        
        try:
            response = await client.get("/orders.json", params=params)
            response.raise_for_status()
            orders = response.json().get("orders", [])
            
            if not orders:
                return {
                    "analytics": {
                        "total_revenue": 0,
                        "total_orders": 0,
                        "average_order_value": 0,
                        "total_items_sold": 0,
                        "refund_rate": 0,
                        "top_products": [],
                        "period": {"from": date_from, "to": date_to}
                    }
                }
            
            # Calculate metrics
            total_revenue = 0
            total_refunds = 0
            total_items = 0
            product_sales: Dict[str, Dict] = {}
            
            for order in orders:
                total_price = float(order.get("total_price", 0))
                financial_status = order.get("financial_status", "")
                
                if financial_status in ["paid", "partially_paid"]:
                    total_revenue += total_price
                elif financial_status == "refunded":
                    total_refunds += total_price
                
                for item in order.get("line_items", []):
                    title = item.get("title", "Unknown")
                    quantity = item.get("quantity", 0)
                    price = float(item.get("price", 0))
                    
                    total_items += quantity
                    
                    if title not in product_sales:
                        product_sales[title] = {"quantity": 0, "revenue": 0}
                    product_sales[title]["quantity"] += quantity
                    product_sales[title]["revenue"] += price * quantity
            
            # Top products by revenue
            top_products = sorted(
                [{"name": k, **v} for k, v in product_sales.items()],
                key=lambda x: x["revenue"],
                reverse=True
            )[:10]
            
            order_count = len(orders)
            aov = total_revenue / order_count if order_count > 0 else 0
            refund_rate = (total_refunds / (total_revenue + total_refunds) * 100) if (total_revenue + total_refunds) > 0 else 0
            
            return {
                "analytics": {
                    "total_revenue": round(total_revenue, 2),
                    "total_orders": order_count,
                    "average_order_value": round(aov, 2),
                    "total_items_sold": total_items,
                    "total_refunds": round(total_refunds, 2),
                    "refund_rate": round(refund_rate, 2),
                    "top_products": top_products,
                    "period": {"from": date_from, "to": date_to}
                }
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"API error: {e.response.status_code}"}


@shopify_mcp.tool
async def get_inventory_levels(
    shop: str,
    user_id: str = "default",
    low_stock_threshold: int = 10
) -> Dict[str, Any]:
    """Get inventory levels with low stock alerts.
    
    Args:
        shop: Shopify store domain
        user_id: User identifier
        low_stock_threshold: Threshold for low stock warning
        
    Returns:
        Inventory summary with low stock items
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "shopify")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not shop and token_data.metadata:
        shop = token_data.metadata.get("shop", "")
    
    async with get_shopify_client(shop, token_data.access_token) as client:
        try:
            response = await client.get("/products.json", params={"limit": 250})
            response.raise_for_status()
            products = response.json().get("products", [])
            
            inventory_items = []
            low_stock_items = []
            out_of_stock_items = []
            total_inventory_value = 0
            
            for product in products:
                for variant in product.get("variants", []):
                    quantity = variant.get("inventory_quantity", 0)
                    price = float(variant.get("price", 0))
                    
                    item = {
                        "product_id": product.get("id"),
                        "product_title": product.get("title"),
                        "variant_id": variant.get("id"),
                        "variant_title": variant.get("title"),
                        "sku": variant.get("sku"),
                        "quantity": quantity,
                        "price": price,
                        "inventory_value": round(quantity * price, 2),
                    }
                    
                    inventory_items.append(item)
                    total_inventory_value += quantity * price
                    
                    if quantity == 0:
                        out_of_stock_items.append(item)
                    elif quantity <= low_stock_threshold:
                        low_stock_items.append(item)
            
            return {
                "inventory": {
                    "total_variants": len(inventory_items),
                    "total_inventory_value": round(total_inventory_value, 2),
                    "out_of_stock_count": len(out_of_stock_items),
                    "low_stock_count": len(low_stock_items),
                    "low_stock_threshold": low_stock_threshold,
                    "out_of_stock_items": out_of_stock_items[:20],
                    "low_stock_items": low_stock_items[:20],
                }
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Abandoned Checkouts
# =============================================================================

@shopify_mcp.tool
async def get_abandoned_checkouts(
    shop: str,
    user_id: str = "default",
    limit: int = 50
) -> Dict[str, Any]:
    """Fetch abandoned checkouts for recovery analysis.
    
    Args:
        shop: Shopify store domain
        user_id: User identifier
        limit: Maximum checkouts to return
        
    Returns:
        List of abandoned checkouts with recovery potential
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "shopify")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not shop and token_data.metadata:
        shop = token_data.metadata.get("shop", "")
    
    async with get_shopify_client(shop, token_data.access_token) as client:
        try:
            response = await client.get(
                "/checkouts.json",
                params={"limit": min(limit, 250)}
            )
            response.raise_for_status()
            checkouts = response.json().get("checkouts", [])
            
            # Filter to abandoned (not completed)
            abandoned = []
            total_abandoned_value = 0
            
            for checkout in checkouts:
                if checkout.get("completed_at"):
                    continue  # Skip completed checkouts
                
                total_price = float(checkout.get("total_price", 0))
                total_abandoned_value += total_price
                
                abandoned.append({
                    "id": checkout.get("id"),
                    "token": checkout.get("token"),
                    "email": checkout.get("email"),
                    "total_price": total_price,
                    "currency": checkout.get("currency"),
                    "created_at": checkout.get("created_at"),
                    "updated_at": checkout.get("updated_at"),
                    "abandoned_checkout_url": checkout.get("abandoned_checkout_url"),
                    "line_items_count": len(checkout.get("line_items", [])),
                })
            
            return {
                "abandoned_checkouts": abandoned,
                "count": len(abandoned),
                "total_abandoned_value": round(total_abandoned_value, 2),
            }
            
        except httpx.HTTPStatusError as e:
            # Checkouts endpoint may not be available on all plans
            if e.response.status_code == 404:
                return {"error": "Abandoned checkouts not available on your Shopify plan"}
            return {"error": f"API error: {e.response.status_code}"}


# =============================================================================
# Helper Functions
# =============================================================================

def _success_html(platform: str, account: str = "") -> HTMLResponse:
    """Generate success HTML page."""
    return HTMLResponse(content=f"""
<!DOCTYPE html>
<html>
<head>
    <title>Connection Successful - Credora</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; justify-content: center; align-items: center;
            height: 100vh; margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }}
        .container {{
            background: white; padding: 40px; border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px;
        }}
        .success-icon {{ font-size: 64px; margin-bottom: 20px; }}
        h1 {{ color: #333; margin-bottom: 10px; }}
        p {{ color: #666; line-height: 1.6; }}
        .platform {{ color: #667eea; font-weight: bold; }}
        .btn {{
            display: inline-block; margin-top: 20px; padding: 12px 24px;
            background: #667eea; color: white; text-decoration: none;
            border-radius: 8px; font-weight: 500;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>Connection Successful!</h1>
        <p>Your <span class="platform">{platform}</span> account has been connected to Credora.</p>
        {f'<p style="font-size: 14px; color: #888;">Account: {account}</p>' if account else ''}
        <a href="http://localhost:3000/settings" class="btn">Return to Credora</a>
    </div>
</body>
</html>
""")


def _error_html(error: str) -> HTMLResponse:
    """Generate error HTML page."""
    return HTMLResponse(content=f"""
<!DOCTYPE html>
<html>
<head>
    <title>Connection Failed - Credora</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; justify-content: center; align-items: center;
            height: 100vh; margin: 0;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
        }}
        .container {{
            background: white; padding: 40px; border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px;
        }}
        .error-icon {{ font-size: 64px; margin-bottom: 20px; }}
        h1 {{ color: #333; margin-bottom: 10px; }}
        p {{ color: #666; line-height: 1.6; }}
        .error-msg {{
            background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px;
            padding: 12px; margin-top: 20px; color: #c53030; font-size: 14px;
        }}
        .btn {{
            display: inline-block; margin-top: 20px; padding: 12px 24px;
            background: #667eea; color: white; text-decoration: none;
            border-radius: 8px; font-weight: 500;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Connection Failed</h1>
        <p>We couldn't connect your account. Please try again.</p>
        <div class="error-msg">{error}</div>
        <a href="http://localhost:3000/settings" class="btn">Return to Credora</a>
    </div>
</body>
</html>
""", status_code=400)


# =============================================================================
# Server Entry Point
# =============================================================================

if __name__ == "__main__":
    shopify_mcp.run()
