"""CFO Agent state management tools.

Requirements: 4.2

These tools allow the CFO Agent to access and update session state
for context management across conversations.
"""

import json
from typing import Optional
from agents import function_tool

from credora.state import StateManager
from credora.models import SessionState


# Module-level state manager instance
_state_manager: Optional[StateManager] = None


def get_state_manager() -> StateManager:
    """Get the current state manager instance.
    
    Returns:
        The StateManager instance
    """
    global _state_manager
    if _state_manager is None:
        _state_manager = StateManager()
    return _state_manager


def set_state_manager(manager: StateManager) -> None:
    """Set the state manager instance (for testing).
    
    Args:
        manager: The StateManager instance to use
    """
    global _state_manager
    _state_manager = manager


def _session_state_to_dict(state: SessionState) -> dict:
    """Convert SessionState to a JSON-serializable dictionary.
    
    Args:
        state: The SessionState to convert
        
    Returns:
        Dictionary representation of the state
    """
    return {
        "user_id": state.user_id,
        "connected_platforms": state.connected_platforms,
        "business_goals": state.business_goals,
        "completed_analyses": state.completed_analyses,
        "onboarding_complete": state.onboarding_complete,
        "last_interaction": state.last_interaction.isoformat(),
    }


@function_tool
def get_session_state(user_id: str) -> str:
    """Retrieve the current session state for a user.
    
    Use this tool to access the user's context including connected platforms,
    business goals, completed analyses, and onboarding status. This helps
    avoid asking redundant questions and maintain conversation continuity.
    
    Args:
        user_id: The unique identifier for the user
        
    Returns:
        JSON string containing the session state with fields:
        - user_id: The user's identifier
        - connected_platforms: List of connected e-commerce platforms
        - business_goals: List of user's business objectives
        - completed_analyses: List of analyses already performed
        - onboarding_complete: Whether onboarding is finished
        - last_interaction: Timestamp of last interaction
        
    Requirements: 4.2
    """
    if not user_id or not user_id.strip():
        return json.dumps({
            "error": "user_id is required and cannot be empty",
            "success": False
        })
    
    try:
        manager = get_state_manager()
        state = manager.get_session_state(user_id)
        
        result = _session_state_to_dict(state)
        result["success"] = True
        
        return json.dumps(result)
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "success": False
        })


@function_tool
def update_session_state(user_id: str, updates_json: str) -> str:
    """Update the session state for a user.
    
    Use this tool to persist changes to the user's context, such as
    recording completed analyses, updating business goals, or marking
    onboarding as complete.
    
    Args:
        user_id: The unique identifier for the user
        updates_json: JSON string containing fields to update. Valid fields:
            - connected_platforms: List of platform names
            - business_goals: List of goal strings
            - completed_analyses: List of analysis type strings
            - onboarding_complete: Boolean
            
    Returns:
        JSON string containing the updated session state or error message
        
    Requirements: 4.2
    """
    if not user_id or not user_id.strip():
        return json.dumps({
            "error": "user_id is required and cannot be empty",
            "success": False
        })
    
    try:
        updates = json.loads(updates_json)
    except json.JSONDecodeError as e:
        return json.dumps({
            "error": f"Invalid JSON in updates_json: {str(e)}",
            "success": False
        })
    
    if not isinstance(updates, dict):
        return json.dumps({
            "error": "updates_json must be a JSON object",
            "success": False
        })
    
    try:
        manager = get_state_manager()
        state = manager.update_session_state(user_id, updates)
        
        result = _session_state_to_dict(state)
        result["success"] = True
        
        return json.dumps(result)
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "success": False
        })


__all__ = [
    "get_session_state",
    "update_session_state",
    "get_state_manager",
    "set_state_manager",
]


# ==================== FPA Engine Integration ====================

from datetime import date, datetime, timedelta
from credora.tools.fpa_engine import (
    FPAEngineClient,
    FPAEngineError,
    FPAEngineConnectionError,
    get_fpa_client,
)
import asyncio


def _run_async(coro):
    """Run an async coroutine synchronously."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a new task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


@function_tool
def calculate_pnl(user_id: str, start_date: str, end_date: str) -> str:
    """Calculate P&L (Profit & Loss) statement for a date range.
    
    Use this tool to generate a comprehensive P&L report showing revenue,
    costs, and profitability for the specified period.
    
    Args:
        user_id: The unique identifier for the user
        start_date: Start date in ISO format (YYYY-MM-DD)
        end_date: End date in ISO format (YYYY-MM-DD)
        
    Returns:
        JSON string containing P&L report with:
        - revenue: Total revenue from orders
        - cogs: Cost of goods sold
        - grossProfit: Revenue minus COGS
        - operatingCosts: Ad spend and other expenses
        - netProfit: Final profit after all costs
        
    Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    except ValueError as e:
        return json.dumps({"error": f"Invalid date format: {e}", "success": False})
    
    try:
        client = get_fpa_client()
        result = _run_async(client.calculate_pnl(user_id, start, end))
        result["success"] = True
        return json.dumps(result)
    except FPAEngineConnectionError as e:
        return json.dumps({
            "error": f"FPA Engine unavailable: {e}",
            "success": False,
            "hint": "The Java FPA Engine may not be running. Start it with 'mvn spring-boot:run' in credora-engine/"
        })
    except FPAEngineError as e:
        return json.dumps({"error": str(e), "success": False, "details": e.details})
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


@function_tool
def forecast_cash_flow(user_id: str, days_ahead: int = 30) -> str:
    """Forecast cash flow for upcoming days.
    
    Use this tool to predict future cash positions based on historical
    patterns, including burn rate and runway calculations.
    
    Args:
        user_id: The unique identifier for the user
        days_ahead: Number of days to forecast (default: 30)
        
    Returns:
        JSON string containing forecast with:
        - currentCash: Current cash position
        - burnRate: Daily burn rate
        - runwayDays: Days until cash runs out
        - lowScenario/midScenario/highScenario: Confidence intervals
        
    Requirements: 4.2, 4.3, 4.6
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    
    try:
        client = get_fpa_client()
        result = _run_async(client.forecast_cash(user_id, days_ahead))
        result["success"] = True
        return json.dumps(result)
    except FPAEngineConnectionError as e:
        return json.dumps({
            "error": f"FPA Engine unavailable: {e}",
            "success": False,
            "hint": "The Java FPA Engine may not be running."
        })
    except FPAEngineError as e:
        return json.dumps({"error": str(e), "success": False, "details": e.details})
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


@function_tool
def analyze_sku_economics(user_id: str, sku_ids: str = "") -> str:
    """Analyze unit economics for SKUs.
    
    Use this tool to get per-product profitability metrics including
    profit per unit, customer acquisition cost, and true ROAS.
    
    Args:
        user_id: The unique identifier for the user
        sku_ids: Comma-separated list of SKU IDs (optional, analyzes all if empty)
        
    Returns:
        JSON string containing SKU analysis with:
        - skus: List of SKU metrics including profit_per_unit, cac, refund_rate, true_roas
        
    Requirements: 5.1, 5.2, 5.3, 5.5
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    
    sku_list = [s.strip() for s in sku_ids.split(",") if s.strip()] if sku_ids else None
    
    try:
        client = get_fpa_client()
        result = _run_async(client.analyze_skus(user_id, sku_list))
        result["success"] = True
        return json.dumps(result)
    except FPAEngineConnectionError as e:
        return json.dumps({
            "error": f"FPA Engine unavailable: {e}",
            "success": False
        })
    except FPAEngineError as e:
        return json.dumps({"error": str(e), "success": False, "details": e.details})
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


@function_tool
def get_campaign_rankings(user_id: str, limit: int = 5) -> str:
    """Get ranked campaigns by effective ROAS.
    
    Use this tool to identify top-performing and underperforming campaigns
    based on true profitability (accounting for product margins).
    
    Args:
        user_id: The unique identifier for the user
        limit: Number of top/bottom campaigns to return (default: 5)
        
    Returns:
        JSON string containing:
        - top: List of top-performing campaigns
        - bottom: List of worst-performing campaigns
        
    Requirements: 6.1, 6.2, 6.3
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    
    try:
        client = get_fpa_client()
        result = _run_async(client.get_ranked_campaigns(user_id, top=limit, bottom=limit))
        result["success"] = True
        return json.dumps(result)
    except FPAEngineConnectionError as e:
        return json.dumps({
            "error": f"FPA Engine unavailable: {e}",
            "success": False
        })
    except FPAEngineError as e:
        return json.dumps({"error": str(e), "success": False, "details": e.details})
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


@function_tool
def simulate_ad_spend_change(user_id: str, change_percent: float) -> str:
    """Simulate changing ad spend by a percentage.
    
    Use this tool to model the cascading effects of ad spend changes
    on impressions, clicks, conversions, and revenue.
    
    Args:
        user_id: The unique identifier for the user
        change_percent: Percentage change (e.g., -20 for 20% decrease, 15 for 15% increase)
        
    Returns:
        JSON string containing simulation result with baseline, projected, and impact metrics
        
    Requirements: 7.1
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    
    try:
        client = get_fpa_client()
        result = _run_async(client.simulate_ad_spend_change(user_id, change_percent))
        result["success"] = True
        return json.dumps(result)
    except FPAEngineConnectionError as e:
        return json.dumps({
            "error": f"FPA Engine unavailable: {e}",
            "success": False
        })
    except FPAEngineError as e:
        return json.dumps({"error": str(e), "success": False, "details": e.details})
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


@function_tool
def simulate_price_change(user_id: str, sku_id: str, change_percent: float, elasticity: float = 0.5) -> str:
    """Simulate changing price for a SKU.
    
    Use this tool to model the effect of price changes on demand and profit,
    accounting for price elasticity.
    
    Args:
        user_id: The unique identifier for the user
        sku_id: The SKU to simulate price change for
        change_percent: Percentage change (e.g., 10 for 10% increase)
        elasticity: Price elasticity coefficient (default: 0.5)
        
    Returns:
        JSON string containing simulation result with profit impact
        
    Requirements: 7.2
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    if not sku_id or not sku_id.strip():
        return json.dumps({"error": "sku_id is required", "success": False})
    
    try:
        client = get_fpa_client()
        result = _run_async(client.simulate_price_change(user_id, sku_id, change_percent, elasticity))
        result["success"] = True
        return json.dumps(result)
    except FPAEngineConnectionError as e:
        return json.dumps({
            "error": f"FPA Engine unavailable: {e}",
            "success": False
        })
    except FPAEngineError as e:
        return json.dumps({"error": str(e), "success": False, "details": e.details})
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


@function_tool
def simulate_inventory_order(user_id: str, sku_id: str, units: int) -> str:
    """Simulate ordering additional inventory.
    
    Use this tool to calculate the cash outflow, projected revenue,
    and break-even timeline for an inventory order.
    
    Args:
        user_id: The unique identifier for the user
        sku_id: The SKU to order
        units: Number of units to order
        
    Returns:
        JSON string containing simulation result with cash flow impact and break-even days
        
    Requirements: 7.3
    """
    if not user_id or not user_id.strip():
        return json.dumps({"error": "user_id is required", "success": False})
    if not sku_id or not sku_id.strip():
        return json.dumps({"error": "sku_id is required", "success": False})
    if units <= 0:
        return json.dumps({"error": "units must be positive", "success": False})
    
    try:
        client = get_fpa_client()
        result = _run_async(client.simulate_inventory_order(user_id, sku_id, units))
        result["success"] = True
        return json.dumps(result)
    except FPAEngineConnectionError as e:
        return json.dumps({
            "error": f"FPA Engine unavailable: {e}",
            "success": False
        })
    except FPAEngineError as e:
        return json.dumps({"error": str(e), "success": False, "details": e.details})
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})


# Update __all__ to include FPA tools
__all__ = [
    "get_session_state",
    "update_session_state",
    "get_state_manager",
    "set_state_manager",
    # FPA tools
    "calculate_pnl",
    "forecast_cash_flow",
    "analyze_sku_economics",
    "get_campaign_rankings",
    "simulate_ad_spend_change",
    "simulate_price_change",
    "simulate_inventory_order",
]
