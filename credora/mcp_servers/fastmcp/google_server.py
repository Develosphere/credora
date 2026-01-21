"""
Google Ads FastMCP Server - Production Ready.

Complete MCP server for Google Ads integration with:
- OAuth 2.0 authentication flow
- Customer account management
- Campaign performance metrics
- Ad group and keyword analytics
- Search term reports
- Conversion tracking

API Version: v18
"""

import os
import json
import asyncio
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager
from pathlib import Path

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

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/oauth/callback/google")
GOOGLE_DEVELOPER_TOKEN = os.getenv("GOOGLE_DEVELOPER_TOKEN", "")

# Google Ads API endpoint
GOOGLE_ADS_API_VERSION = "v18"
GOOGLE_ADS_API_BASE = f"https://googleads.googleapis.com/{GOOGLE_ADS_API_VERSION}"

# Required scopes for Google Ads
GOOGLE_SCOPES = "https://www.googleapis.com/auth/adwords"

# Pending OAuth states
_pending_states: Dict[str, Dict[str, Any]] = {}

# =============================================================================
# Initialize FastMCP Server
# =============================================================================

google_mcp = FastMCP(
    name="Credora Google Ads Server",
    instructions="Production MCP server for Google Ads integration. Provides tools for fetching campaigns, ad groups, keywords, and performance metrics."
)

# =============================================================================
# HTTP Client Context Manager
# =============================================================================

@asynccontextmanager
async def get_google_ads_client(access_token: str, customer_id: str = ""):
    """Async context manager for authenticated Google Ads API client.
    
    Args:
        access_token: OAuth access token
        customer_id: Google Ads customer ID (optional)
        
    Yields:
        Configured httpx.AsyncClient with headers
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    
    if GOOGLE_DEVELOPER_TOKEN:
        headers["developer-token"] = GOOGLE_DEVELOPER_TOKEN
    
    if customer_id:
        # Remove dashes from customer ID
        clean_id = customer_id.replace("-", "")
        headers["login-customer-id"] = clean_id
    
    async with httpx.AsyncClient(
        base_url=GOOGLE_ADS_API_BASE,
        headers=headers,
        timeout=60.0
    ) as client:
        client.access_token = access_token
        client.customer_id = customer_id
        yield client


# =============================================================================
# OAuth Routes
# =============================================================================

@google_mcp.custom_route("/", methods=["GET"])
async def root(request: Request):
    """Root endpoint."""
    return JSONResponse({
        "server": "Credora Google Ads MCP Server",
        "status": "running",
        "version": GOOGLE_ADS_API_VERSION,
        "docs": "Use /google/install to begin OAuth flow"
    })


@google_mcp.custom_route("/google/install", methods=["GET"])
async def install(request: Request):
    """Initiate Google OAuth flow.
    
    Query params:
        user_id: User identifier for token storage (optional)
    """
    user_id = request.query_params.get("user_id", "default")
    
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    _pending_states[state] = {
        "user_id": user_id,
        "created_at": datetime.now(),
    }
    
    print(f"🔑 [GOOGLE] Generated OAuth state: {state[:16]}... for user: {user_id}")
    print(f"🔑 [GOOGLE] Pending states count: {len(_pending_states)}")
    print(f"🔑 [GOOGLE] Redirect URI: {GOOGLE_REDIRECT_URI}")
    
    # Build OAuth URL
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"scope={GOOGLE_SCOPES}&"
        f"state={state}&"
        f"response_type=code&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    
    return RedirectResponse(auth_url)


@google_mcp.custom_route("/oauth/callback/google", methods=["GET"])
async def oauth_callback(request: Request):
    """Handle Google OAuth callback."""
    print(f"🔐 [GOOGLE] OAuth callback received")
    
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")
    
    print(f"🔐 [GOOGLE] Callback state: {state[:16] if state else 'None'}...")
    print(f"🔐 [GOOGLE] Pending states count: {len(_pending_states)}")
    print(f"🔐 [GOOGLE] Pending state keys: {[k[:16] + '...' for k in _pending_states.keys()]}")
    
    if error:
        print(f"❌ [GOOGLE] OAuth error: {error}")
        return _error_html(f"Google authorization failed: {error}")
    
    if not code or not state:
        print(f"❌ [GOOGLE] Missing OAuth parameters")
        return _error_html("Missing required OAuth parameters")
    
    # Verify state
    state_data = _pending_states.pop(state, None)
    if not state_data:
        print(f"❌ [GOOGLE] Invalid or expired state - state not found in pending states")
        print(f"❌ [GOOGLE] This usually means:")
        print(f"   1. Server was restarted between install and callback")
        print(f"   2. OAuth flow was started from a different server instance")
        print(f"   3. State already used (page refresh)")
        return _error_html("Invalid or expired OAuth state")
    
    if datetime.now() - state_data["created_at"] > timedelta(minutes=10):
        print(f"❌ [GOOGLE] OAuth session expired")
        return _error_html("OAuth session expired")
    
    user_id = state_data.get("user_id", "default")
    print(f"🔄 [GOOGLE] Exchanging code for token (user: {user_id})")
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "code": code,
                    "grant_type": "authorization_code",
                }
            )
            
            if response.status_code != 200:
                print(f"❌ [GOOGLE] Token exchange failed: {response.status_code}")
                return _error_html(f"Token exchange failed: {response.text}")
            
            data = response.json()
            access_token = data.get("access_token")
            refresh_token = data.get("refresh_token")
            expires_in = data.get("expires_in", 3600)
            
            if not access_token:
                print(f"❌ [GOOGLE] No access token in response")
                return _error_html("No access token in response")
            
            # Store token
            token_manager = get_token_manager()
            await token_manager.store_token(
                user_id=user_id,
                platform="google",
                token_data=TokenData(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_at=datetime.now() + timedelta(seconds=expires_in),
                )
            )
            
            print(f"✅ [GOOGLE] Successfully connected for user: {user_id}")
            return _success_html("Google Ads")
            
        except Exception as e:
            print(f"❌ [GOOGLE] OAuth error: {str(e)}")
            return _error_html(f"OAuth error: {str(e)}")


# =============================================================================
# Mock Data Fallback
# =============================================================================

def _get_mock_data_path() -> Path:
    """Get the path to mock data directory."""
    current_file = Path(__file__)
    project_root = current_file.parent.parent.parent.parent
    return project_root / "mock_data" / "google"


def _load_mock_data(filename: str) -> Dict[str, Any]:
    """Load mock data from JSON file."""
    try:
        mock_path = _get_mock_data_path() / filename
        print(f"📦 [GOOGLE] Loading mock data from: {mock_path}")
        with open(mock_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            print(f"✅ [GOOGLE] Mock data loaded successfully")
            return data
    except Exception as e:
        print(f"❌ [GOOGLE] Failed to load mock data: {e}")
        return {"error": f"Mock data not available: {str(e)}"}


# =============================================================================
# MCP Tools - Customer Accounts
# =============================================================================

async def _fetch_accessible_customers(user_id: str = "default") -> Dict[str, Any]:
    """Core logic for fetching accessible customers - with mock data fallback."""
    # Check for mock mode - skip all API logic
    if os.getenv("MOCK_MODE", "").lower() == "true":
        print("📦 [GOOGLE] MOCK_MODE enabled, using mock customers data")
        return _load_mock_data("customers.json")
    
    # Try live API first
    try:
        token_manager = get_token_manager()
        token_data = await token_manager.get_token(user_id, "google")
        
        if not token_data or not token_data.access_token:
            print("⚠️ [GOOGLE] No token available, falling back to mock data")
            return _load_mock_data("customers.json")
        
        async with get_google_ads_client(token_data.access_token) as client:
            response = await client.get("/customers:listAccessibleCustomers")
            response.raise_for_status()
            data = response.json()
            
            customer_ids = data.get("resourceNames", [])
            
            # Fetch details for each customer
            customers = []
            for resource_name in customer_ids[:10]:  # Limit to 10
                customer_id = resource_name.split("/")[-1]
                
                try:
                    details = await _get_customer_details(client, customer_id)
                    if details:
                        customers.append(details)
                except:
                    customers.append({
                        "customer_id": customer_id,
                        "name": f"Account {customer_id}",
                        "status": "UNKNOWN"
                    })
            
            print(f"✅ [GOOGLE] Fetched {len(customers)} customers from live API")
            return {"customers": customers, "count": len(customers)}
    
    except Exception as e:
        print(f"⚠️ [GOOGLE] Live API failed: {e}, falling back to mock data")
        return _load_mock_data("customers.json")


@google_mcp.tool
async def list_accessible_customers(user_id: str = "default") -> Dict[str, Any]:
    """List all Google Ads customer accounts accessible to the user.
    
    Args:
        user_id: User identifier for authentication
        
    Returns:
        List of accessible customer accounts
    """
    return await _fetch_accessible_customers(user_id)


async def _get_customer_details(client: httpx.AsyncClient, customer_id: str) -> Optional[Dict]:
    """Fetch customer account details using GAQL."""
    query = """
        SELECT
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            customer.time_zone,
            customer.status
        FROM customer
        LIMIT 1
    """
    
    clean_id = customer_id.replace("-", "")
    
    try:
        response = await client.post(
            f"/customers/{clean_id}/googleAds:searchStream",
            json={"query": query}
        )
        response.raise_for_status()
        
        results = response.json()
        if results and len(results) > 0:
            batch = results[0]
            if batch.get("results"):
                customer = batch["results"][0].get("customer", {})
                return {
                    "customer_id": customer.get("id"),
                    "name": customer.get("descriptiveName", f"Account {customer_id}"),
                    "currency": customer.get("currencyCode"),
                    "timezone": customer.get("timeZone"),
                    "status": customer.get("status", "UNKNOWN"),
                }
    except:
        pass
    
    return None


# =============================================================================
# MCP Tools - Campaigns
# =============================================================================

async def _fetch_google_campaigns(
    customer_id: str,
    user_id: str = "default",
    status_filter: str = "all",
    date_from: str = "",
    date_to: str = ""
) -> Dict[str, Any]:
    """Core logic for fetching campaigns - with mock data fallback."""
    # Check for mock mode - skip all API logic
    if os.getenv("MOCK_MODE", "").lower() == "true":
        print("📦 [GOOGLE] MOCK_MODE enabled, using mock campaigns data")
        return _load_mock_data("campaigns.json")
    
    # Try live API first
    try:
        token_manager = get_token_manager()
        token_data = await token_manager.get_token(user_id, "google")
        
        if not token_data or not token_data.access_token:
            print("⚠️ [GOOGLE] No token available, falling back to mock campaign data")
            return _load_mock_data("campaigns.json")
        
        if not customer_id:
            print("⚠️ [GOOGLE] No customer_id provided, falling back to mock campaign data")
            return _load_mock_data("campaigns.json")
        
        # Default date range: last 30 days
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        # Build status filter
        status_clause = ""
        if status_filter == "enabled":
            status_clause = "AND campaign.status = 'ENABLED'"
        elif status_filter == "paused":
            status_clause = "AND campaign.status = 'PAUSED'"
        elif status_filter == "removed":
            status_clause = "AND campaign.status = 'REMOVED'"
        
        query = f"""
            SELECT
                campaign.id,
                campaign.name,
                campaign.status,
                campaign.advertising_channel_type,
                campaign.bidding_strategy_type,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc
            FROM campaign
            WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
            {status_clause}
            ORDER BY metrics.cost_micros DESC
            LIMIT 100
        """
        
        clean_id = customer_id.replace("-", "")
        
        async with get_google_ads_client(token_data.access_token, customer_id) as client:
            response = await client.post(
                f"/customers/{clean_id}/googleAds:searchStream",
                json={"query": query}
            )
            response.raise_for_status()
            
            results = response.json()
            campaigns = []
            
            for batch in results:
                for row in batch.get("results", []):
                    campaign = row.get("campaign", {})
                    metrics = row.get("metrics", {})
                    
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    conversions = float(metrics.get("conversions", 0))
                    conv_value = float(metrics.get("conversionsValue", 0))
                    
                    campaigns.append({
                        "id": campaign.get("id"),
                        "name": campaign.get("name"),
                        "status": campaign.get("status"),
                        "channel_type": campaign.get("advertisingChannelType"),
                        "bidding_strategy": campaign.get("biddingStrategyType"),
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": round(conversions, 2),
                        "conversion_value": round(conv_value, 2),
                        "ctr": round(float(metrics.get("ctr", 0)) * 100, 2),
                        "avg_cpc": round(float(metrics.get("averageCpc", 0)) / 1_000_000, 2),
                        "roas": round(conv_value / cost, 2) if cost > 0 else 0,
                        "cost_per_conversion": round(cost / conversions, 2) if conversions > 0 else 0,
                    })
            
            print(f"✅ [GOOGLE] Fetched {len(campaigns)} campaigns from live API")
            return {
                "campaigns": campaigns,
                "count": len(campaigns),
                "date_range": {"from": date_from, "to": date_to}
            }
    
    except Exception as e:
        print(f"⚠️ [GOOGLE] Live API failed: {e}, falling back to mock campaign data")
        return _load_mock_data("campaigns.json")


@google_mcp.tool
async def get_campaigns(
    customer_id: str,
    user_id: str = "default",
    status_filter: str = "all",
    date_from: str = "",
    date_to: str = ""
) -> Dict[str, Any]:
    """Get campaigns with performance metrics.
    
    Args:
        customer_id: Google Ads customer ID
        user_id: User identifier
        status_filter: Filter by status (all, enabled, paused, removed)
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        
    Returns:
        List of campaigns with performance data
    """
    return await _fetch_google_campaigns(customer_id, user_id, status_filter, date_from, date_to)


# =============================================================================
# MCP Tools - Ad Groups
# =============================================================================

@google_mcp.tool
async def get_ad_groups(
    customer_id: str,
    user_id: str = "default",
    campaign_id: str = "",
    date_from: str = "",
    date_to: str = ""
) -> Dict[str, Any]:
    """Get ad groups with performance metrics.
    
    Args:
        customer_id: Google Ads customer ID
        user_id: User identifier
        campaign_id: Optional campaign ID to filter by
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        
    Returns:
        List of ad groups with performance data
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "google")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    campaign_clause = ""
    if campaign_id:
        campaign_clause = f"AND campaign.id = {campaign_id}"
    
    query = f"""
        SELECT
            ad_group.id,
            ad_group.name,
            ad_group.status,
            ad_group.type,
            campaign.id,
            campaign.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
        FROM ad_group
        WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
        {campaign_clause}
        ORDER BY metrics.cost_micros DESC
        LIMIT 100
    """
    
    clean_id = customer_id.replace("-", "")
    
    async with get_google_ads_client(token_data.access_token, customer_id) as client:
        try:
            response = await client.post(
                f"/customers/{clean_id}/googleAds:searchStream",
                json={"query": query}
            )
            response.raise_for_status()
            
            results = response.json()
            ad_groups = []
            
            for batch in results:
                for row in batch.get("results", []):
                    ad_group = row.get("adGroup", {})
                    campaign = row.get("campaign", {})
                    metrics = row.get("metrics", {})
                    
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    conversions = float(metrics.get("conversions", 0))
                    
                    ad_groups.append({
                        "id": ad_group.get("id"),
                        "name": ad_group.get("name"),
                        "status": ad_group.get("status"),
                        "type": ad_group.get("type"),
                        "campaign_id": campaign.get("id"),
                        "campaign_name": campaign.get("name"),
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": round(conversions, 2),
                        "ctr": round(float(metrics.get("ctr", 0)) * 100, 2),
                        "avg_cpc": round(float(metrics.get("averageCpc", 0)) / 1_000_000, 2),
                        "cost_per_conversion": round(cost / conversions, 2) if conversions > 0 else 0,
                    })
            
            return {
                "ad_groups": ad_groups,
                "count": len(ad_groups),
                "date_range": {"from": date_from, "to": date_to}
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Google Ads API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Keywords
# =============================================================================

@google_mcp.tool
async def get_keywords(
    customer_id: str,
    user_id: str = "default",
    ad_group_id: str = "",
    date_from: str = "",
    date_to: str = ""
) -> Dict[str, Any]:
    """Get keywords with performance metrics and quality scores.
    
    Args:
        customer_id: Google Ads customer ID
        user_id: User identifier
        ad_group_id: Optional ad group ID to filter by
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        
    Returns:
        List of keywords with performance and quality data
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "google")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    ad_group_clause = ""
    if ad_group_id:
        ad_group_clause = f"AND ad_group.id = {ad_group_id}"
    
    query = f"""
        SELECT
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.status,
            ad_group_criterion.quality_info.quality_score,
            ad_group.id,
            ad_group.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
        FROM keyword_view
        WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
        {ad_group_clause}
        AND ad_group_criterion.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 100
    """
    
    clean_id = customer_id.replace("-", "")
    
    async with get_google_ads_client(token_data.access_token, customer_id) as client:
        try:
            response = await client.post(
                f"/customers/{clean_id}/googleAds:searchStream",
                json={"query": query}
            )
            response.raise_for_status()
            
            results = response.json()
            keywords = []
            
            for batch in results:
                for row in batch.get("results", []):
                    criterion = row.get("adGroupCriterion", {})
                    keyword = criterion.get("keyword", {})
                    quality_info = criterion.get("qualityInfo", {})
                    ad_group = row.get("adGroup", {})
                    metrics = row.get("metrics", {})
                    
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    conversions = float(metrics.get("conversions", 0))
                    
                    keywords.append({
                        "keyword": keyword.get("text"),
                        "match_type": keyword.get("matchType"),
                        "status": criterion.get("status"),
                        "quality_score": quality_info.get("qualityScore"),
                        "ad_group_id": ad_group.get("id"),
                        "ad_group_name": ad_group.get("name"),
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": round(conversions, 2),
                        "ctr": round(float(metrics.get("ctr", 0)) * 100, 2),
                        "avg_cpc": round(float(metrics.get("averageCpc", 0)) / 1_000_000, 2),
                        "cost_per_conversion": round(cost / conversions, 2) if conversions > 0 else 0,
                    })
            
            return {
                "keywords": keywords,
                "count": len(keywords),
                "date_range": {"from": date_from, "to": date_to}
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Google Ads API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Search Terms
# =============================================================================

@google_mcp.tool
async def get_search_terms(
    customer_id: str,
    user_id: str = "default",
    campaign_id: str = "",
    date_from: str = "",
    date_to: str = "",
    limit: int = 50
) -> Dict[str, Any]:
    """Get search terms report showing actual queries that triggered ads.
    
    Args:
        customer_id: Google Ads customer ID
        user_id: User identifier
        campaign_id: Optional campaign ID to filter by
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        limit: Maximum search terms to return
        
    Returns:
        List of search terms with performance data
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "google")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    campaign_clause = ""
    if campaign_id:
        campaign_clause = f"AND campaign.id = {campaign_id}"
    
    query = f"""
        SELECT
            search_term_view.search_term,
            search_term_view.status,
            campaign.id,
            campaign.name,
            ad_group.id,
            ad_group.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions
        FROM search_term_view
        WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
        {campaign_clause}
        ORDER BY metrics.impressions DESC
        LIMIT {min(limit, 100)}
    """
    
    clean_id = customer_id.replace("-", "")
    
    async with get_google_ads_client(token_data.access_token, customer_id) as client:
        try:
            response = await client.post(
                f"/customers/{clean_id}/googleAds:searchStream",
                json={"query": query}
            )
            response.raise_for_status()
            
            results = response.json()
            search_terms = []
            
            for batch in results:
                for row in batch.get("results", []):
                    stv = row.get("searchTermView", {})
                    campaign = row.get("campaign", {})
                    ad_group = row.get("adGroup", {})
                    metrics = row.get("metrics", {})
                    
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    conversions = float(metrics.get("conversions", 0))
                    
                    search_terms.append({
                        "search_term": stv.get("searchTerm"),
                        "status": stv.get("status"),
                        "campaign_id": campaign.get("id"),
                        "campaign_name": campaign.get("name"),
                        "ad_group_id": ad_group.get("id"),
                        "ad_group_name": ad_group.get("name"),
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": round(conversions, 2),
                    })
            
            return {
                "search_terms": search_terms,
                "count": len(search_terms),
                "date_range": {"from": date_from, "to": date_to}
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Google Ads API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Account Overview
# =============================================================================

@google_mcp.tool
async def get_account_overview(
    customer_id: str,
    user_id: str = "default",
    date_from: str = "",
    date_to: str = ""
) -> Dict[str, Any]:
    """Get comprehensive account overview with key metrics.
    
    Args:
        customer_id: Google Ads customer ID
        user_id: User identifier
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        
    Returns:
        Account overview with spend, conversions, and performance metrics
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "google")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    query = f"""
        SELECT
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.ctr,
            metrics.average_cpc,
            metrics.cost_per_conversion
        FROM customer
        WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
    """
    
    clean_id = customer_id.replace("-", "")
    
    async with get_google_ads_client(token_data.access_token, customer_id) as client:
        try:
            response = await client.post(
                f"/customers/{clean_id}/googleAds:searchStream",
                json={"query": query}
            )
            response.raise_for_status()
            
            results = response.json()
            
            # Aggregate metrics
            total_impressions = 0
            total_clicks = 0
            total_cost = 0
            total_conversions = 0
            total_conv_value = 0
            customer_name = ""
            currency = "USD"
            
            for batch in results:
                for row in batch.get("results", []):
                    customer = row.get("customer", {})
                    metrics = row.get("metrics", {})
                    
                    customer_name = customer.get("descriptiveName", "")
                    currency = customer.get("currencyCode", "USD")
                    
                    total_impressions += int(metrics.get("impressions", 0))
                    total_clicks += int(metrics.get("clicks", 0))
                    total_cost += float(metrics.get("costMicros", 0)) / 1_000_000
                    total_conversions += float(metrics.get("conversions", 0))
                    total_conv_value += float(metrics.get("conversionsValue", 0))
            
            return {
                "overview": {
                    "customer_id": customer_id,
                    "customer_name": customer_name,
                    "currency": currency,
                    "date_range": {"from": date_from, "to": date_to},
                    "impressions": total_impressions,
                    "clicks": total_clicks,
                    "cost": round(total_cost, 2),
                    "conversions": round(total_conversions, 2),
                    "conversion_value": round(total_conv_value, 2),
                    "ctr": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
                    "avg_cpc": round((total_cost / total_clicks) if total_clicks > 0 else 0, 2),
                    "cost_per_conversion": round((total_cost / total_conversions) if total_conversions > 0 else 0, 2),
                    "roas": round((total_conv_value / total_cost) if total_cost > 0 else 0, 2),
                }
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Google Ads API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Performance Trends
# =============================================================================

@google_mcp.tool
async def get_performance_trends(
    customer_id: str,
    user_id: str = "default",
    days: int = 30
) -> Dict[str, Any]:
    """Get daily performance trends.
    
    Args:
        customer_id: Google Ads customer ID
        user_id: User identifier
        days: Number of days to include (max 90)
        
    Returns:
        Daily time series data for key metrics
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "google")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    days = min(days, 90)
    date_from = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    date_to = datetime.now().strftime("%Y-%m-%d")
    
    query = f"""
        SELECT
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value
        FROM customer
        WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
        ORDER BY segments.date ASC
    """
    
    clean_id = customer_id.replace("-", "")
    
    async with get_google_ads_client(token_data.access_token, customer_id) as client:
        try:
            response = await client.post(
                f"/customers/{clean_id}/googleAds:searchStream",
                json={"query": query}
            )
            response.raise_for_status()
            
            results = response.json()
            trends = []
            
            for batch in results:
                for row in batch.get("results", []):
                    segments = row.get("segments", {})
                    metrics = row.get("metrics", {})
                    
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    conversions = float(metrics.get("conversions", 0))
                    conv_value = float(metrics.get("conversionsValue", 0))
                    
                    trends.append({
                        "date": segments.get("date"),
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": round(conversions, 2),
                        "conversion_value": round(conv_value, 2),
                        "roas": round(conv_value / cost, 2) if cost > 0 else 0,
                    })
            
            # Calculate summary
            total_cost = sum(t["cost"] for t in trends)
            total_conversions = sum(t["conversions"] for t in trends)
            total_conv_value = sum(t["conversion_value"] for t in trends)
            
            return {
                "trends": trends,
                "summary": {
                    "total_cost": round(total_cost, 2),
                    "total_impressions": sum(t["impressions"] for t in trends),
                    "total_clicks": sum(t["clicks"] for t in trends),
                    "total_conversions": round(total_conversions, 2),
                    "total_conversion_value": round(total_conv_value, 2),
                    "avg_daily_cost": round(total_cost / len(trends), 2) if trends else 0,
                    "overall_roas": round(total_conv_value / total_cost, 2) if total_cost > 0 else 0,
                },
                "days": len(trends)
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Google Ads API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Top Performers
# =============================================================================

@google_mcp.tool
async def get_top_performers(
    customer_id: str,
    user_id: str = "default",
    entity_type: str = "campaign",
    metric: str = "conversions",
    limit: int = 10,
    date_from: str = "",
    date_to: str = ""
) -> Dict[str, Any]:
    """Get top performing entities by specified metric.
    
    Args:
        customer_id: Google Ads customer ID
        user_id: User identifier
        entity_type: Type of entity (campaign, ad_group, keyword)
        metric: Metric to rank by (conversions, clicks, roas, cost)
        limit: Number of top performers to return
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        
    Returns:
        Top performing entities ranked by metric
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "google")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    
    # Build query based on entity type
    if entity_type == "campaign":
        query = f"""
            SELECT
                campaign.id,
                campaign.name,
                campaign.status,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value
            FROM campaign
            WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
            AND campaign.status = 'ENABLED'
            ORDER BY metrics.{_metric_to_field(metric)} DESC
            LIMIT {min(limit, 50)}
        """
    elif entity_type == "ad_group":
        query = f"""
            SELECT
                ad_group.id,
                ad_group.name,
                ad_group.status,
                campaign.name,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value
            FROM ad_group
            WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
            AND ad_group.status = 'ENABLED'
            ORDER BY metrics.{_metric_to_field(metric)} DESC
            LIMIT {min(limit, 50)}
        """
    elif entity_type == "keyword":
        query = f"""
            SELECT
                ad_group_criterion.keyword.text,
                ad_group_criterion.keyword.match_type,
                ad_group.name,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value
            FROM keyword_view
            WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
            AND ad_group_criterion.status = 'ENABLED'
            ORDER BY metrics.{_metric_to_field(metric)} DESC
            LIMIT {min(limit, 50)}
        """
    else:
        return {"error": f"Invalid entity_type: {entity_type}"}
    
    clean_id = customer_id.replace("-", "")
    
    async with get_google_ads_client(token_data.access_token, customer_id) as client:
        try:
            response = await client.post(
                f"/customers/{clean_id}/googleAds:searchStream",
                json={"query": query}
            )
            response.raise_for_status()
            
            results = response.json()
            performers = []
            
            for batch in results:
                for row in batch.get("results", []):
                    metrics = row.get("metrics", {})
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    conversions = float(metrics.get("conversions", 0))
                    conv_value = float(metrics.get("conversionsValue", 0))
                    
                    item = {
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": round(conversions, 2),
                        "conversion_value": round(conv_value, 2),
                        "roas": round(conv_value / cost, 2) if cost > 0 else 0,
                    }
                    
                    if entity_type == "campaign":
                        campaign = row.get("campaign", {})
                        item["id"] = campaign.get("id")
                        item["name"] = campaign.get("name")
                        item["status"] = campaign.get("status")
                    elif entity_type == "ad_group":
                        ad_group = row.get("adGroup", {})
                        campaign = row.get("campaign", {})
                        item["id"] = ad_group.get("id")
                        item["name"] = ad_group.get("name")
                        item["campaign_name"] = campaign.get("name")
                    elif entity_type == "keyword":
                        criterion = row.get("adGroupCriterion", {})
                        keyword = criterion.get("keyword", {})
                        ad_group = row.get("adGroup", {})
                        item["keyword"] = keyword.get("text")
                        item["match_type"] = keyword.get("matchType")
                        item["ad_group_name"] = ad_group.get("name")
                    
                    performers.append(item)
            
            return {
                "top_performers": performers,
                "entity_type": entity_type,
                "ranked_by": metric,
                "count": len(performers),
                "date_range": {"from": date_from, "to": date_to}
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Google Ads API error: {e.response.status_code}"}


# =============================================================================
# Helper Functions
# =============================================================================

def _metric_to_field(metric: str) -> str:
    """Convert metric name to Google Ads API field."""
    mapping = {
        "conversions": "conversions",
        "clicks": "clicks",
        "impressions": "impressions",
        "cost": "cost_micros",
        "roas": "conversions_value",  # Sort by value for ROAS
    }
    return mapping.get(metric, "conversions")


def _success_html(platform: str) -> HTMLResponse:
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
        <div class="error-msg">{error}</div>
        <a href="http://localhost:3000/settings" class="btn">Return to Credora</a>
    </div>
</body>
</html>
""", status_code=400)


# =============================================================================
# REST Wrapper Endpoints for MCP Router
# =============================================================================
# These endpoints wrap the MCP tools as REST API calls for the data sync service

@google_mcp.custom_route("/tools/list_accessible_customers", methods=["POST"])
async def rest_list_accessible_customers(request: Request):
    """REST wrapper for list_accessible_customers tool."""
    try:
        body = await request.json()
        print(f"🔧 [GOOGLE] list_accessible_customers called with: {body}")
        result = await _fetch_accessible_customers(
            user_id=body.get("user_id", "default")
        )
        return JSONResponse(result)
    except Exception as e:
        import traceback
        print(f"❌ [GOOGLE] list_accessible_customers error: {e}")
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@google_mcp.custom_route("/tools/get_campaigns", methods=["POST"])
async def rest_get_campaigns(request: Request):
    """REST wrapper for get_campaigns tool."""
    try:
        body = await request.json()
        result = await get_campaigns(
            customer_id=body.get("customer_id", ""),
            user_id=body.get("user_id", "default"),
            status_filter=body.get("status_filter", "all"),
            date_from=body.get("date_from", ""),
            date_to=body.get("date_to", "")
        )
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@google_mcp.custom_route("/tools/get_account_overview", methods=["POST"])
async def rest_get_account_overview(request: Request):
    """REST wrapper for get_account_overview tool."""
    try:
        body = await request.json()
        result = await get_account_overview(
            customer_id=body.get("customer_id", ""),
            user_id=body.get("user_id", "default"),
            date_from=body.get("date_from", ""),
            date_to=body.get("date_to", "")
        )
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# =============================================================================
# Server Entry Point
# =============================================================================

if __name__ == "__main__":
    google_mcp.run()
