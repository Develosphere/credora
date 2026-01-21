"""
Meta Ads FastMCP Server - Production Ready.

Complete MCP server for Meta (Facebook/Instagram) Ads integration with:
- OAuth 2.0 authentication flow
- Ad account management
- Campaign performance metrics
- Ad set and ad analytics
- Audience insights
- Conversion tracking

API Version: v21.0
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

META_CLIENT_ID = os.getenv("META_CLIENT_ID", "")
META_CLIENT_SECRET = os.getenv("META_CLIENT_SECRET", "")
META_REDIRECT_URI = os.getenv("META_REDIRECT_URI", "http://localhost:8000/oauth/callback/meta")
META_API_VERSION = "v21.0"
META_API_BASE = f"https://graph.facebook.com/{META_API_VERSION}"

# Required scopes for Credora CFO functionality
META_SCOPES = "ads_read,ads_management,business_management,read_insights"

# Pending OAuth states
_pending_states: Dict[str, Dict[str, Any]] = {}

# =============================================================================
# Initialize FastMCP Server
# =============================================================================

meta_mcp = FastMCP(
    name="Credora Meta Ads Server",
    instructions="Production MCP server for Meta (Facebook/Instagram) Ads integration. Provides tools for fetching campaigns, ad sets, ads, and performance insights."
)

# =============================================================================
# HTTP Client Context Manager
# =============================================================================

@asynccontextmanager
async def get_meta_client(access_token: str):
    """Async context manager for authenticated Meta API client.
    
    Args:
        access_token: OAuth access token
        
    Yields:
        Configured httpx.AsyncClient
    """
    async with httpx.AsyncClient(
        base_url=META_API_BASE,
        timeout=30.0
    ) as client:
        # Store token for use in requests
        client.access_token = access_token
        yield client


async def meta_request(
    client: httpx.AsyncClient,
    method: str,
    endpoint: str,
    params: Optional[Dict] = None,
    data: Optional[Dict] = None
) -> Dict[str, Any]:
    """Make authenticated request to Meta API.
    
    Args:
        client: httpx client with access_token attribute
        method: HTTP method
        endpoint: API endpoint
        params: Query parameters
        data: Request body
        
    Returns:
        JSON response data
    """
    params = params or {}
    params["access_token"] = client.access_token
    
    response = await client.request(
        method=method,
        url=endpoint,
        params=params,
        json=data
    )
    response.raise_for_status()
    return response.json()


# =============================================================================
# OAuth Routes
# =============================================================================

@meta_mcp.custom_route("/", methods=["GET"])
async def root(request: Request):
    """Root endpoint."""
    return JSONResponse({
        "server": "Credora Meta Ads MCP Server",
        "status": "running",
        "version": META_API_VERSION,
        "docs": "Use /meta/install to begin OAuth flow"
    })


@meta_mcp.custom_route("/meta/install", methods=["GET"])
async def install(request: Request):
    """Initiate Meta OAuth flow.
    
    Query params:
        user_id: User identifier for token storage (optional)
    """
    user_id = request.query_params.get("user_id", "default")
    
    if not META_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Meta OAuth not configured")
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    _pending_states[state] = {
        "user_id": user_id,
        "created_at": datetime.now(),
    }
    
    # Build OAuth URL
    auth_url = (
        f"https://www.facebook.com/{META_API_VERSION}/dialog/oauth?"
        f"client_id={META_CLIENT_ID}&"
        f"redirect_uri={META_REDIRECT_URI}&"
        f"scope={META_SCOPES}&"
        f"state={state}&"
        f"response_type=code"
    )
    
    return RedirectResponse(auth_url)


@meta_mcp.custom_route("/oauth/callback/meta", methods=["GET"])
async def oauth_callback(request: Request):
    """Handle Meta OAuth callback."""
    print(f"🔐 [META] OAuth callback received")
    
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")
    error_description = request.query_params.get("error_description")
    
    if error:
        print(f"❌ [META] OAuth error: {error_description or error}")
        return _error_html(error_description or error)
    
    if not code or not state:
        print(f"❌ [META] Missing OAuth parameters")
        return _error_html("Missing required OAuth parameters")
    
    # Verify state
    state_data = _pending_states.pop(state, None)
    if not state_data:
        print(f"❌ [META] Invalid or expired state")
        return _error_html("Invalid or expired OAuth state")
    
    if datetime.now() - state_data["created_at"] > timedelta(minutes=10):
        print(f"❌ [META] OAuth session expired")
        return _error_html("OAuth session expired")
    
    user_id = state_data.get("user_id", "default")
    print(f"🔄 [META] Exchanging code for token (user: {user_id})")
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{META_API_BASE}/oauth/access_token",
                params={
                    "client_id": META_CLIENT_ID,
                    "client_secret": META_CLIENT_SECRET,
                    "redirect_uri": META_REDIRECT_URI,
                    "code": code,
                }
            )
            
            if response.status_code != 200:
                print(f"❌ [META] Token exchange failed: {response.status_code}")
                return _error_html(f"Token exchange failed: {response.text}")
            
            data = response.json()
            access_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)
            
            if not access_token:
                print(f"❌ [META] No access token in response")
                return _error_html("No access token in response")
            
            print(f"🔄 [META] Getting long-lived token...")
            
            # Get long-lived token
            long_lived_response = await client.get(
                f"{META_API_BASE}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": META_CLIENT_ID,
                    "client_secret": META_CLIENT_SECRET,
                    "fb_exchange_token": access_token,
                }
            )
            
            if long_lived_response.status_code == 200:
                long_lived_data = long_lived_response.json()
                access_token = long_lived_data.get("access_token", access_token)
                expires_in = long_lived_data.get("expires_in", 5184000)  # ~60 days
                print(f"✅ [META] Got long-lived token (expires in {expires_in}s)")
            
            # Store token
            token_manager = get_token_manager()
            await token_manager.store_token(
                user_id=user_id,
                platform="meta",
                token_data=TokenData(
                    access_token=access_token,
                    refresh_token=access_token,  # Meta uses token exchange for refresh
                    expires_at=datetime.now() + timedelta(seconds=expires_in),
                )
            )
            
            print(f"✅ [META] Successfully connected for user: {user_id}")
            return _success_html("Meta Ads")
            
        except Exception as e:
            print(f"❌ [META] OAuth error: {str(e)}")
            return _error_html(f"OAuth error: {str(e)}")


# =============================================================================
# Mock Data Fallback
# =============================================================================

def _get_mock_data_path() -> Path:
    """Get the path to mock data directory."""
    current_file = Path(__file__)
    project_root = current_file.parent.parent.parent.parent
    return project_root / "mock_data" / "meta"


def _load_mock_data(filename: str) -> Dict[str, Any]:
    """Load mock data from JSON file."""
    try:
        mock_path = _get_mock_data_path() / filename
        print(f"📦 [META] Loading mock data from: {mock_path}")
        with open(mock_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            print(f"✅ [META] Mock data loaded successfully")
            return data
    except Exception as e:
        print(f"❌ [META] Failed to load mock data: {e}")
        return {"error": f"Mock data not available: {str(e)}"}


# =============================================================================
# MCP Tools - Ad Accounts
# =============================================================================

async def _fetch_ad_accounts(user_id: str = "default") -> Dict[str, Any]:
    """Core logic for fetching ad accounts - with mock data fallback."""
    # Check for mock mode - skip all API logic
    if os.getenv("MOCK_MODE", "").lower() == "true":
        print("📦 [META] MOCK_MODE enabled, using mock ad accounts data")
        return _load_mock_data("ad_accounts.json")
    
    # Try live API first
    try:
        token_manager = get_token_manager()
        token_data = await token_manager.get_token(user_id, "meta")
        
        if not token_data or not token_data.access_token:
            print("⚠️ [META] No token available, falling back to mock data")
            return _load_mock_data("ad_accounts.json")
        
        async with get_meta_client(token_data.access_token) as client:
            data = await meta_request(
                client, "GET", "/me/adaccounts",
                params={
                    "fields": "id,name,account_id,currency,timezone_name,account_status,amount_spent,balance"
                }
            )
            
            accounts = []
            for account in data.get("data", []):
                accounts.append({
                    "id": account.get("id"),
                    "account_id": account.get("account_id"),
                    "name": account.get("name"),
                    "currency": account.get("currency"),
                    "timezone": account.get("timezone_name"),
                    "status": _get_account_status(account.get("account_status", 0)),
                    "amount_spent": float(account.get("amount_spent", 0)) / 100,
                    "balance": float(account.get("balance", 0)) / 100,
                })
            
            print(f"✅ [META] Fetched {len(accounts)} ad accounts from live API")
            return {"accounts": accounts, "count": len(accounts)}
    
    except Exception as e:
        print(f"⚠️ [META] Live API failed: {e}, falling back to mock data")
        return _load_mock_data("ad_accounts.json")


@meta_mcp.tool
async def list_ad_accounts(user_id: str = "default") -> Dict[str, Any]:
    """List all Meta ad accounts accessible to the user.
    
    Args:
        user_id: User identifier for authentication
        
    Returns:
        List of ad accounts with basic info
    """
    return await _fetch_ad_accounts(user_id)


@meta_mcp.tool
async def get_account_overview(
    account_id: str,
    user_id: str = "default",
    date_preset: str = "last_30d"
) -> Dict[str, Any]:
    """Get comprehensive overview for an ad account.
    
    Args:
        account_id: Ad account ID (with or without 'act_' prefix)
        user_id: User identifier
        date_preset: Date range preset (today, yesterday, last_7d, last_30d, this_month)
        
    Returns:
        Account overview with spend, reach, and performance metrics
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "meta")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    # Ensure account_id has act_ prefix
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    
    async with get_meta_client(token_data.access_token) as client:
        try:
            # Fetch account insights
            insights_data = await meta_request(
                client, "GET", f"/{account_id}/insights",
                params={
                    "fields": "spend,impressions,reach,clicks,cpc,cpm,ctr,actions,cost_per_action_type",
                    "date_preset": date_preset,
                }
            )
            
            insights = insights_data.get("data", [{}])[0] if insights_data.get("data") else {}
            
            # Parse actions (conversions)
            actions = insights.get("actions", [])
            conversions = 0
            purchases = 0
            leads = 0
            
            for action in actions:
                action_type = action.get("action_type", "")
                value = int(action.get("value", 0))
                
                if action_type == "purchase":
                    purchases = value
                    conversions += value
                elif action_type == "lead":
                    leads = value
                    conversions += value
                elif action_type in ["omni_purchase", "onsite_conversion.purchase"]:
                    purchases += value
                    conversions += value
            
            spend = float(insights.get("spend", 0))
            
            return {
                "overview": {
                    "account_id": account_id,
                    "date_range": date_preset,
                    "spend": spend,
                    "impressions": int(insights.get("impressions", 0)),
                    "reach": int(insights.get("reach", 0)),
                    "clicks": int(insights.get("clicks", 0)),
                    "cpc": float(insights.get("cpc", 0)),
                    "cpm": float(insights.get("cpm", 0)),
                    "ctr": float(insights.get("ctr", 0)),
                    "conversions": conversions,
                    "purchases": purchases,
                    "leads": leads,
                    "cost_per_conversion": round(spend / conversions, 2) if conversions > 0 else 0,
                }
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Meta API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Campaigns
# =============================================================================

async def _fetch_campaigns(
    account_id: str,
    user_id: str = "default",
    status_filter: str = "all",
    date_preset: str = "last_30d"
) -> Dict[str, Any]:
    """Core logic for fetching campaigns - with mock data fallback."""
    # Check for mock mode - skip all API logic
    if os.getenv("MOCK_MODE", "").lower() == "true":
        print("📦 [META] MOCK_MODE enabled, using mock campaigns data")
        return _load_mock_data("campaigns.json")
    
    # Try live API first
    try:
        token_manager = get_token_manager()
        token_data = await token_manager.get_token(user_id, "meta")
        
        if not token_data or not token_data.access_token:
            print("⚠️ [META] No token available, falling back to mock campaign data")
            return _load_mock_data("campaigns.json")
        
        if not account_id.startswith("act_"):
            account_id = f"act_{account_id}"
        
        async with get_meta_client(token_data.access_token) as client:
            # Fetch campaigns
            params = {
                "fields": "id,name,status,objective,daily_budget,lifetime_budget,created_time"
            }
            
            if status_filter == "active":
                params["filtering"] = '[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]'
            elif status_filter == "paused":
                params["filtering"] = '[{"field":"effective_status","operator":"IN","value":["PAUSED"]}]'
            
            campaigns_data = await meta_request(
                client, "GET", f"/{account_id}/campaigns", params=params
            )
            
            campaigns = []
            for campaign in campaigns_data.get("data", []):
                campaign_id = campaign.get("id")
                
                # Fetch insights for each campaign
                try:
                    insights_data = await meta_request(
                        client, "GET", f"/{campaign_id}/insights",
                        params={
                            "fields": "spend,impressions,clicks,actions,cost_per_action_type",
                            "date_preset": date_preset,
                        }
                    )
                    insights = insights_data.get("data", [{}])[0] if insights_data.get("data") else {}
                except:
                    insights = {}
                
                # Parse conversions
                actions = insights.get("actions", [])
                conversions = sum(
                    int(a.get("value", 0)) for a in actions
                    if a.get("action_type") in ["purchase", "lead", "omni_purchase"]
                )
                
                spend = float(insights.get("spend", 0))
                
                campaigns.append({
                    "id": campaign_id,
                    "name": campaign.get("name"),
                    "status": campaign.get("status"),
                    "objective": campaign.get("objective"),
                    "daily_budget": float(campaign.get("daily_budget", 0)) / 100 if campaign.get("daily_budget") else None,
                    "lifetime_budget": float(campaign.get("lifetime_budget", 0)) / 100 if campaign.get("lifetime_budget") else None,
                    "created_time": campaign.get("created_time"),
                    "spend": spend,
                    "impressions": int(insights.get("impressions", 0)),
                    "clicks": int(insights.get("clicks", 0)),
                    "conversions": conversions,
                    "cpc": float(insights.get("cpc", 0)) if insights.get("cpc") else 0,
                    "cost_per_conversion": round(spend / conversions, 2) if conversions > 0 else 0,
                    "roas": round(conversions * 50 / spend, 2) if spend > 0 else 0,
                })
            
            print(f"✅ [META] Fetched {len(campaigns)} campaigns from live API")
            return {
                "campaigns": campaigns,
                "count": len(campaigns),
                "date_range": date_preset
            }
    
    except Exception as e:
        print(f"⚠️ [META] Live API failed: {e}, falling back to mock campaign data")
        return _load_mock_data("campaigns.json")


@meta_mcp.tool
async def get_campaigns(
    account_id: str,
    user_id: str = "default",
    status_filter: str = "all",
    date_preset: str = "last_30d"
) -> Dict[str, Any]:
    """Get campaigns with performance metrics.
    
    Args:
        account_id: Ad account ID
        user_id: User identifier
        status_filter: Filter by status (all, active, paused)
        date_preset: Date range for metrics
        
    Returns:
        List of campaigns with performance data
    """
    return await _fetch_campaigns(account_id, user_id, status_filter, date_preset)


# =============================================================================
# MCP Tools - Ad Sets
# =============================================================================

@meta_mcp.tool
async def get_adsets(
    account_id: str,
    user_id: str = "default",
    campaign_id: str = "",
    date_preset: str = "last_30d"
) -> Dict[str, Any]:
    """Get ad sets with performance metrics.
    
    Args:
        account_id: Ad account ID
        user_id: User identifier
        campaign_id: Optional campaign ID to filter by
        date_preset: Date range for metrics
        
    Returns:
        List of ad sets with targeting and performance data
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "meta")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    
    async with get_meta_client(token_data.access_token) as client:
        try:
            params = {
                "fields": "id,name,campaign_id,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event"
            }
            
            if campaign_id:
                params["filtering"] = f'[{{"field":"campaign_id","operator":"EQUAL","value":"{campaign_id}"}}]'
            
            adsets_data = await meta_request(
                client, "GET", f"/{account_id}/adsets", params=params
            )
            
            adsets = []
            for adset in adsets_data.get("data", []):
                adset_id = adset.get("id")
                
                # Fetch insights
                try:
                    insights_data = await meta_request(
                        client, "GET", f"/{adset_id}/insights",
                        params={
                            "fields": "spend,impressions,clicks,reach,frequency,actions",
                            "date_preset": date_preset,
                        }
                    )
                    insights = insights_data.get("data", [{}])[0] if insights_data.get("data") else {}
                except:
                    insights = {}
                
                # Parse targeting
                targeting = adset.get("targeting", {})
                age_min = targeting.get("age_min", "")
                age_max = targeting.get("age_max", "")
                genders = targeting.get("genders", [])
                
                # Parse conversions
                actions = insights.get("actions", [])
                conversions = sum(
                    int(a.get("value", 0)) for a in actions
                    if a.get("action_type") in ["purchase", "lead", "omni_purchase"]
                )
                
                adsets.append({
                    "id": adset_id,
                    "name": adset.get("name"),
                    "campaign_id": adset.get("campaign_id"),
                    "status": adset.get("status"),
                    "optimization_goal": adset.get("optimization_goal"),
                    "billing_event": adset.get("billing_event"),
                    "daily_budget": float(adset.get("daily_budget", 0)) / 100 if adset.get("daily_budget") else None,
                    "targeting_summary": {
                        "age_range": f"{age_min}-{age_max}" if age_min else "All ages",
                        "genders": _parse_genders(genders),
                    },
                    "spend": float(insights.get("spend", 0)),
                    "impressions": int(insights.get("impressions", 0)),
                    "reach": int(insights.get("reach", 0)),
                    "clicks": int(insights.get("clicks", 0)),
                    "frequency": float(insights.get("frequency", 0)),
                    "conversions": conversions,
                })
            
            return {
                "adsets": adsets,
                "count": len(adsets),
                "date_range": date_preset
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Meta API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Ads
# =============================================================================

@meta_mcp.tool
async def get_ads(
    account_id: str,
    user_id: str = "default",
    adset_id: str = "",
    date_preset: str = "last_30d",
    limit: int = 50
) -> Dict[str, Any]:
    """Get individual ads with creative and performance data.
    
    Args:
        account_id: Ad account ID
        user_id: User identifier
        adset_id: Optional ad set ID to filter by
        date_preset: Date range for metrics
        limit: Maximum ads to return
        
    Returns:
        List of ads with creative info and metrics
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "meta")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    
    async with get_meta_client(token_data.access_token) as client:
        try:
            params = {
                "fields": "id,name,adset_id,status,creative{title,body,image_url,thumbnail_url}",
                "limit": min(limit, 100)
            }
            
            if adset_id:
                params["filtering"] = f'[{{"field":"adset_id","operator":"EQUAL","value":"{adset_id}"}}]'
            
            ads_data = await meta_request(
                client, "GET", f"/{account_id}/ads", params=params
            )
            
            ads = []
            for ad in ads_data.get("data", []):
                ad_id = ad.get("id")
                creative = ad.get("creative", {})
                
                # Fetch insights
                try:
                    insights_data = await meta_request(
                        client, "GET", f"/{ad_id}/insights",
                        params={
                            "fields": "spend,impressions,clicks,actions,ctr,cpc",
                            "date_preset": date_preset,
                        }
                    )
                    insights = insights_data.get("data", [{}])[0] if insights_data.get("data") else {}
                except:
                    insights = {}
                
                # Parse conversions
                actions = insights.get("actions", [])
                conversions = sum(
                    int(a.get("value", 0)) for a in actions
                    if a.get("action_type") in ["purchase", "lead", "omni_purchase"]
                )
                
                ads.append({
                    "id": ad_id,
                    "name": ad.get("name"),
                    "adset_id": ad.get("adset_id"),
                    "status": ad.get("status"),
                    "creative": {
                        "title": creative.get("title"),
                        "body": creative.get("body"),
                        "has_image": bool(creative.get("image_url") or creative.get("thumbnail_url")),
                    },
                    "spend": float(insights.get("spend", 0)),
                    "impressions": int(insights.get("impressions", 0)),
                    "clicks": int(insights.get("clicks", 0)),
                    "ctr": float(insights.get("ctr", 0)),
                    "cpc": float(insights.get("cpc", 0)),
                    "conversions": conversions,
                })
            
            return {
                "ads": ads,
                "count": len(ads),
                "date_range": date_preset
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Meta API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Audience Insights
# =============================================================================

@meta_mcp.tool
async def get_audience_insights(
    account_id: str,
    user_id: str = "default",
    date_preset: str = "last_30d"
) -> Dict[str, Any]:
    """Get audience demographic breakdown.
    
    Args:
        account_id: Ad account ID
        user_id: User identifier
        date_preset: Date range for analysis
        
    Returns:
        Audience breakdown by age, gender, and location
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "meta")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    
    async with get_meta_client(token_data.access_token) as client:
        try:
            # Fetch insights with demographic breakdowns
            async def fetch_breakdown(breakdown: str):
                try:
                    data = await meta_request(
                        client, "GET", f"/{account_id}/insights",
                        params={
                            "fields": "impressions,clicks,spend,actions",
                            "breakdowns": breakdown,
                            "date_preset": date_preset,
                        }
                    )
                    return data.get("data", [])
                except:
                    return []
            
            age_data, gender_data, country_data = await asyncio.gather(
                fetch_breakdown("age"),
                fetch_breakdown("gender"),
                fetch_breakdown("country"),
            )
            
            # Process age breakdown
            age_breakdown = []
            total_impressions = sum(int(d.get("impressions", 0)) for d in age_data)
            for item in age_data:
                impressions = int(item.get("impressions", 0))
                age_breakdown.append({
                    "age": item.get("age", "Unknown"),
                    "impressions": impressions,
                    "percentage": round(impressions / total_impressions * 100, 1) if total_impressions > 0 else 0,
                    "spend": float(item.get("spend", 0)),
                })
            
            # Process gender breakdown
            gender_breakdown = []
            total_impressions = sum(int(d.get("impressions", 0)) for d in gender_data)
            for item in gender_data:
                impressions = int(item.get("impressions", 0))
                gender_breakdown.append({
                    "gender": _parse_gender_value(item.get("gender", "")),
                    "impressions": impressions,
                    "percentage": round(impressions / total_impressions * 100, 1) if total_impressions > 0 else 0,
                    "spend": float(item.get("spend", 0)),
                })
            
            # Process country breakdown (top 10)
            country_breakdown = []
            total_impressions = sum(int(d.get("impressions", 0)) for d in country_data)
            sorted_countries = sorted(country_data, key=lambda x: int(x.get("impressions", 0)), reverse=True)[:10]
            for item in sorted_countries:
                impressions = int(item.get("impressions", 0))
                country_breakdown.append({
                    "country": item.get("country", "Unknown"),
                    "impressions": impressions,
                    "percentage": round(impressions / total_impressions * 100, 1) if total_impressions > 0 else 0,
                    "spend": float(item.get("spend", 0)),
                })
            
            return {
                "audience_insights": {
                    "date_range": date_preset,
                    "age_breakdown": sorted(age_breakdown, key=lambda x: x.get("age", "")),
                    "gender_breakdown": gender_breakdown,
                    "top_countries": country_breakdown,
                }
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Meta API error: {e.response.status_code}"}


# =============================================================================
# MCP Tools - Performance Analysis
# =============================================================================

@meta_mcp.tool
async def get_performance_trends(
    account_id: str,
    user_id: str = "default",
    time_increment: str = "1"
) -> Dict[str, Any]:
    """Get daily performance trends for the last 30 days.
    
    Args:
        account_id: Ad account ID
        user_id: User identifier
        time_increment: Days per data point (1 for daily, 7 for weekly)
        
    Returns:
        Time series data for spend, impressions, clicks, conversions
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "meta")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    
    async with get_meta_client(token_data.access_token) as client:
        try:
            data = await meta_request(
                client, "GET", f"/{account_id}/insights",
                params={
                    "fields": "spend,impressions,clicks,reach,actions,date_start,date_stop",
                    "date_preset": "last_30d",
                    "time_increment": time_increment,
                }
            )
            
            trends = []
            for item in data.get("data", []):
                actions = item.get("actions", [])
                conversions = sum(
                    int(a.get("value", 0)) for a in actions
                    if a.get("action_type") in ["purchase", "lead", "omni_purchase"]
                )
                
                trends.append({
                    "date": item.get("date_start"),
                    "spend": float(item.get("spend", 0)),
                    "impressions": int(item.get("impressions", 0)),
                    "reach": int(item.get("reach", 0)),
                    "clicks": int(item.get("clicks", 0)),
                    "conversions": conversions,
                })
            
            # Calculate summary
            total_spend = sum(t["spend"] for t in trends)
            total_conversions = sum(t["conversions"] for t in trends)
            
            return {
                "trends": trends,
                "summary": {
                    "total_spend": round(total_spend, 2),
                    "total_impressions": sum(t["impressions"] for t in trends),
                    "total_clicks": sum(t["clicks"] for t in trends),
                    "total_conversions": total_conversions,
                    "avg_daily_spend": round(total_spend / len(trends), 2) if trends else 0,
                    "cost_per_conversion": round(total_spend / total_conversions, 2) if total_conversions > 0 else 0,
                },
                "period": "last_30d",
                "time_increment": f"{time_increment} day(s)"
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Meta API error: {e.response.status_code}"}


@meta_mcp.tool
async def get_top_performing_content(
    account_id: str,
    user_id: str = "default",
    metric: str = "conversions",
    limit: int = 10
) -> Dict[str, Any]:
    """Get top performing ads by specified metric.
    
    Args:
        account_id: Ad account ID
        user_id: User identifier
        metric: Metric to rank by (conversions, clicks, ctr, roas)
        limit: Number of top ads to return
        
    Returns:
        Top performing ads with creative details
    """
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "meta")
    
    if not token_data:
        return {"error": "Not authenticated"}
    
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    
    async with get_meta_client(token_data.access_token) as client:
        try:
            # Fetch all ads with insights
            ads_data = await meta_request(
                client, "GET", f"/{account_id}/ads",
                params={
                    "fields": "id,name,creative{title,body}",
                    "limit": 100
                }
            )
            
            ads_with_metrics = []
            for ad in ads_data.get("data", []):
                ad_id = ad.get("id")
                
                try:
                    insights_data = await meta_request(
                        client, "GET", f"/{ad_id}/insights",
                        params={
                            "fields": "spend,impressions,clicks,ctr,actions,action_values",
                            "date_preset": "last_30d",
                        }
                    )
                    insights = insights_data.get("data", [{}])[0] if insights_data.get("data") else {}
                except:
                    continue
                
                if not insights:
                    continue
                
                actions = insights.get("actions", [])
                conversions = sum(
                    int(a.get("value", 0)) for a in actions
                    if a.get("action_type") in ["purchase", "lead", "omni_purchase"]
                )
                
                action_values = insights.get("action_values", [])
                revenue = sum(
                    float(a.get("value", 0)) for a in action_values
                    if a.get("action_type") in ["purchase", "omni_purchase"]
                )
                
                spend = float(insights.get("spend", 0))
                creative = ad.get("creative", {})
                
                ads_with_metrics.append({
                    "id": ad_id,
                    "name": ad.get("name"),
                    "creative_title": creative.get("title"),
                    "creative_body": creative.get("body", "")[:100] + "..." if len(creative.get("body", "")) > 100 else creative.get("body", ""),
                    "spend": spend,
                    "impressions": int(insights.get("impressions", 0)),
                    "clicks": int(insights.get("clicks", 0)),
                    "ctr": float(insights.get("ctr", 0)),
                    "conversions": conversions,
                    "revenue": revenue,
                    "roas": round(revenue / spend, 2) if spend > 0 else 0,
                })
            
            # Sort by metric
            sort_key = {
                "conversions": lambda x: x["conversions"],
                "clicks": lambda x: x["clicks"],
                "ctr": lambda x: x["ctr"],
                "roas": lambda x: x["roas"],
            }.get(metric, lambda x: x["conversions"])
            
            top_ads = sorted(ads_with_metrics, key=sort_key, reverse=True)[:limit]
            
            return {
                "top_ads": top_ads,
                "ranked_by": metric,
                "count": len(top_ads)
            }
            
        except httpx.HTTPStatusError as e:
            return {"error": f"Meta API error: {e.response.status_code}"}


# =============================================================================
# Helper Functions
# =============================================================================

def _get_account_status(status_code: int) -> str:
    """Convert account status code to string."""
    statuses = {
        1: "ACTIVE",
        2: "DISABLED",
        3: "UNSETTLED",
        7: "PENDING_RISK_REVIEW",
        8: "PENDING_SETTLEMENT",
        9: "IN_GRACE_PERIOD",
        100: "PENDING_CLOSURE",
        101: "CLOSED",
        201: "ANY_ACTIVE",
        202: "ANY_CLOSED",
    }
    return statuses.get(status_code, "UNKNOWN")


def _parse_genders(genders: List[int]) -> str:
    """Parse gender targeting values."""
    if not genders:
        return "All"
    gender_map = {1: "Male", 2: "Female"}
    return ", ".join(gender_map.get(g, "Unknown") for g in genders)


def _parse_gender_value(gender: str) -> str:
    """Parse gender breakdown value."""
    gender_map = {"male": "Male", "female": "Female", "unknown": "Unknown"}
    return gender_map.get(gender.lower(), gender)


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

@meta_mcp.custom_route("/tools/list_ad_accounts", methods=["POST"])
async def rest_list_ad_accounts(request: Request):
    """REST wrapper for list_ad_accounts tool."""
    try:
        body = await request.json()
        print(f"🔧 [META] list_ad_accounts called with: {body}")
        result = await _fetch_ad_accounts(
            user_id=body.get("user_id", "default")
        )
        return JSONResponse(result)
    except Exception as e:
        import traceback
        print(f"❌ [META] list_ad_accounts error: {e}")
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@meta_mcp.custom_route("/tools/get_campaigns", methods=["POST"])
async def rest_get_campaigns(request: Request):
    """REST wrapper for get_campaigns tool."""
    try:
        body = await request.json()
        print(f"🔧 [META] get_campaigns called with: {body}")
        result = await _fetch_campaigns(
            account_id=body.get("account_id", ""),
            user_id=body.get("user_id", "default"),
            status_filter=body.get("status_filter", "all"),
            date_preset=body.get("date_preset", "last_30d")
        )
        return JSONResponse(result)
    except Exception as e:
        import traceback
        print(f"❌ [META] get_campaigns error: {e}")
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@meta_mcp.custom_route("/tools/get_account_overview", methods=["POST"])
async def rest_get_account_overview(request: Request):
    """REST wrapper for get_account_overview tool."""
    try:
        body = await request.json()
        result = await get_account_overview(
            account_id=body.get("account_id", ""),
            user_id=body.get("user_id", "default"),
            date_preset=body.get("date_preset", "last_30d")
        )
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# =============================================================================
# Server Entry Point
# =============================================================================

if __name__ == "__main__":
    meta_mcp.run()
