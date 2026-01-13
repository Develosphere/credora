"""Google Ads tools for CFO Agent.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5

These tools allow the CFO Agent to fetch Google Ads data
including customers, campaigns, keywords, and ad groups.
"""

import os
import json
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from agents import function_tool

from credora.mcp_servers.fastmcp.token_manager import get_token_manager, TokenData
import httpx


def _run_async(coro):
    """Run an async coroutine from sync code."""
    import asyncio
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, coro)
            return future.result()
    except RuntimeError:
        return asyncio.run(coro)


async def _get_google_ads_access_token(user_id: str) -> str:
    """Get access token from FastMCP token manager."""
    token_manager = get_token_manager()
    token_data = await token_manager.get_token(user_id, "google")
    
    if not token_data:
        raise ValueError("Google Ads not connected. Please connect via Settings.")
    
    return token_data.access_token


async def _make_google_ads_request(
    access_token: str,
    customer_id: str,
    query: str,
) -> dict:
    """Make a Google Ads API request using GAQL."""
    developer_token = os.environ.get("GOOGLE_DEVELOPER_TOKEN", "")
    if not developer_token:
        raise ValueError("GOOGLE_DEVELOPER_TOKEN not configured in environment")
    
    clean_id = customer_id.replace("-", "")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "developer-token": developer_token,
        "login-customer-id": clean_id,
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"https://googleads.googleapis.com/v18/customers/{clean_id}/googleAds:searchStream",
            headers=headers,
            json={"query": query}
        )
        response.raise_for_status()
        return response.json()


@function_tool
def list_google_ads_customers(user_id: str) -> str:
    """List all Google Ads customer accounts accessible to the user.
    
    Use this tool to see which Google Ads accounts the user has access to.
    This is typically the first step before fetching campaign data.
    
    Args:
        user_id: The unique identifier for the user
        
    Returns:
        JSON string containing list of customer accounts or error message
    """
    if not user_id or not user_id.strip():
        return json.dumps({
            "error": "user_id is required",
            "success": False
        })
    
    try:
        async def _fetch():
            access_token = await _get_google_ads_access_token(user_id.strip())
            developer_token = os.environ.get("GOOGLE_DEVELOPER_TOKEN", "")
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "developer-token": developer_token,
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(
                    "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers",
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                customer_ids = data.get("resourceNames", [])
                customers = []
                
                for resource_name in customer_ids[:10]:
                    customer_id = resource_name.split("/")[-1]
                    customers.append({
                        "customer_id": customer_id,
                        "name": f"Account {customer_id}",
                    })
                
                return customers
        
        customers = _run_async(_fetch())
        return json.dumps({
            "customers": customers,
            "count": len(customers),
            "success": True
        })
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "success": False
        })


@function_tool
def get_google_ads_campaigns(
    user_id: str,
    customer_id: str,
    date_from: str = "",
    date_to: str = ""
) -> str:
    """Get Google Ads campaigns with performance metrics.
    
    Use this tool to fetch campaign data including impressions, clicks,
    conversions, and cost metrics.
    
    Args:
        user_id: The unique identifier for the user
        customer_id: Google Ads customer ID (e.g., "123-456-7890")
        date_from: Start date in YYYY-MM-DD format (optional)
        date_to: End date in YYYY-MM-DD format (optional)
        
    Returns:
        JSON string containing campaigns with metrics or error message
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    
    if not customer_id or not customer_id.strip():
        return json.dumps({"error": "customer_id is required", "success": False})
    
    try:
        from datetime import datetime, timedelta
        
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        async def _fetch():
            access_token = await _get_google_ads_access_token(user_id.strip())
            
            query = f"""
                SELECT
                    campaign.id,
                    campaign.name,
                    campaign.status,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions
                FROM campaign
                WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
                ORDER BY metrics.cost_micros DESC
                LIMIT 50
            """
            
            results = await _make_google_ads_request(access_token, customer_id.strip(), query)
            
            campaigns = []
            for batch in results:
                for row in batch.get("results", []):
                    campaign = row.get("campaign", {})
                    metrics = row.get("metrics", {})
                    
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    
                    campaigns.append({
                        "id": campaign.get("id"),
                        "name": campaign.get("name"),
                        "status": campaign.get("status"),
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": float(metrics.get("conversions", 0)),
                    })
            
            return campaigns
        
        campaigns = _run_async(_fetch())
        return json.dumps({
            "campaigns": campaigns,
            "count": len(campaigns),
            "success": True
        })
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


@function_tool
def get_google_ads_keywords(
    user_id: str,
    customer_id: str,
    date_from: str = "",
    date_to: str = ""
) -> str:
    """Get Google Ads keywords with performance metrics.
    
    Use this tool to fetch keyword data including impressions, clicks,
    quality score, and cost metrics.
    
    Args:
        user_id: The unique identifier for the user
        customer_id: Google Ads customer ID (e.g., "123-456-7890")
        date_from: Start date in YYYY-MM-DD format (optional)
        date_to: End date in YYYY-MM-DD format (optional)
        
    Returns:
        JSON string containing keywords with metrics or error message
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    
    if not customer_id or not customer_id.strip():
        return json.dumps({"error": "customer_id is required", "success": False})
    
    try:
        from datetime import datetime, timedelta
        
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        async def _fetch():
            access_token = await _get_google_ads_access_token(user_id.strip())
            
            query = f"""
                SELECT
                    ad_group_criterion.keyword.text,
                    ad_group_criterion.keyword.match_type,
                    ad_group_criterion.status,
                    ad_group_criterion.quality_info.quality_score,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions
                FROM keyword_view
                WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
                AND ad_group_criterion.status != 'REMOVED'
                ORDER BY metrics.cost_micros DESC
                LIMIT 50
            """
            
            results = await _make_google_ads_request(access_token, customer_id.strip(), query)
            
            keywords = []
            for batch in results:
                for row in batch.get("results", []):
                    criterion = row.get("adGroupCriterion", {})
                    keyword = criterion.get("keyword", {})
                    quality_info = criterion.get("qualityInfo", {})
                    metrics = row.get("metrics", {})
                    
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    
                    keywords.append({
                        "keyword": keyword.get("text"),
                        "match_type": keyword.get("matchType"),
                        "status": criterion.get("status"),
                        "quality_score": quality_info.get("qualityScore"),
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": float(metrics.get("conversions", 0)),
                    })
            
            return keywords
        
        keywords = _run_async(_fetch())
        return json.dumps({
            "keywords": keywords,
            "count": len(keywords),
            "success": True
        })
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


@function_tool
def get_google_ads_ad_groups(
    user_id: str,
    customer_id: str,
    date_from: str = "",
    date_to: str = ""
) -> str:
    """Get Google Ads ad groups with performance metrics.
    
    Use this tool to fetch ad group data including impressions, clicks,
    conversions, and cost metrics.
    
    Args:
        user_id: The unique identifier for the user
        customer_id: Google Ads customer ID (e.g., "123-456-7890")
        date_from: Start date in YYYY-MM-DD format (optional)
        date_to: End date in YYYY-MM-DD format (optional)
        
    Returns:
        JSON string containing ad groups with metrics or error message
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    
    if not customer_id or not customer_id.strip():
        return json.dumps({"error": "customer_id is required", "success": False})
    
    try:
        from datetime import datetime, timedelta
        
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        async def _fetch():
            access_token = await _get_google_ads_access_token(user_id.strip())
            
            query = f"""
                SELECT
                    ad_group.id,
                    ad_group.name,
                    ad_group.status,
                    campaign.id,
                    campaign.name,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions
                FROM ad_group
                WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
                ORDER BY metrics.cost_micros DESC
                LIMIT 50
            """
            
            results = await _make_google_ads_request(access_token, customer_id.strip(), query)
            
            ad_groups = []
            for batch in results:
                for row in batch.get("results", []):
                    ad_group = row.get("adGroup", {})
                    campaign = row.get("campaign", {})
                    metrics = row.get("metrics", {})
                    
                    cost = float(metrics.get("costMicros", 0)) / 1_000_000
                    
                    ad_groups.append({
                        "id": ad_group.get("id"),
                        "name": ad_group.get("name"),
                        "status": ad_group.get("status"),
                        "campaign_id": campaign.get("id"),
                        "campaign_name": campaign.get("name"),
                        "impressions": int(metrics.get("impressions", 0)),
                        "clicks": int(metrics.get("clicks", 0)),
                        "cost": round(cost, 2),
                        "conversions": float(metrics.get("conversions", 0)),
                    })
            
            return ad_groups
        
        ad_groups = _run_async(_fetch())
        return json.dumps({
            "ad_groups": ad_groups,
            "count": len(ad_groups),
            "success": True
        })
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


__all__ = [
    "list_google_ads_customers",
    "get_google_ads_campaigns",
    "get_google_ads_keywords",
    "get_google_ads_ad_groups",
]
