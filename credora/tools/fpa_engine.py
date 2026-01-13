"""
FPA Engine HTTP Client

HTTP client to communicate with the Java FPA Engine for financial calculations.
Provides async methods for P&L, forecasting, SKU analysis, campaigns, and what-if simulations.

Requirements: 8.1, 8.5
"""

import asyncio
import httpx
from typing import Any, Dict, List, Optional
from datetime import date
from decimal import Decimal
import os
import logging

logger = logging.getLogger(__name__)

# Configuration
FPA_ENGINE_URL = os.getenv("FPA_ENGINE_URL", "http://localhost:8081")
FPA_ENGINE_TIMEOUT = float(os.getenv("FPA_ENGINE_TIMEOUT", "5.0"))
FPA_ENGINE_MAX_RETRIES = int(os.getenv("FPA_ENGINE_MAX_RETRIES", "3"))


class FPAEngineError(Exception):
    """Base exception for FPA Engine errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details or {}


class FPAEngineConnectionError(FPAEngineError):
    """Connection error to FPA Engine."""
    pass


class FPAEngineValidationError(FPAEngineError):
    """Validation error from FPA Engine."""
    pass


class FPAEngineClient:
    """
    Async HTTP client for the Java FPA Engine.
    
    Provides methods for:
    - P&L calculations
    - Cash flow forecasting
    - SKU unit economics analysis
    - Campaign ranking
    - What-if scenario simulations
    """
    
    def __init__(
        self,
        base_url: str = FPA_ENGINE_URL,
        timeout: float = FPA_ENGINE_TIMEOUT,
        max_retries: int = FPA_ENGINE_MAX_RETRIES
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make an HTTP request with retry logic.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            params: Query parameters
            json_data: JSON body data
            
        Returns:
            Response JSON as dictionary
            
        Raises:
            FPAEngineError: On API errors
            FPAEngineConnectionError: On connection failures
        """
        client = await self._get_client()
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = await client.request(
                    method=method,
                    url=endpoint,
                    params=params,
                    json=json_data
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 400:
                    error_data = response.json() if response.content else {}
                    raise FPAEngineValidationError(
                        error_data.get("message", "Validation error"),
                        status_code=400,
                        details=error_data
                    )
                elif response.status_code == 404:
                    error_data = response.json() if response.content else {}
                    raise FPAEngineError(
                        error_data.get("message", "Not found"),
                        status_code=404,
                        details=error_data
                    )
                elif response.status_code == 422:
                    error_data = response.json() if response.content else {}
                    raise FPAEngineError(
                        error_data.get("message", "Insufficient data"),
                        status_code=422,
                        details=error_data
                    )
                elif response.status_code >= 500:
                    # Server error - retry
                    error_data = response.json() if response.content else {}
                    last_error = FPAEngineError(
                        error_data.get("message", f"Server error: {response.status_code}"),
                        status_code=response.status_code,
                        details=error_data
                    )
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    raise last_error
                else:
                    error_data = response.json() if response.content else {}
                    raise FPAEngineError(
                        error_data.get("message", f"HTTP {response.status_code}"),
                        status_code=response.status_code,
                        details=error_data
                    )
                    
            except httpx.ConnectError as e:
                last_error = FPAEngineConnectionError(
                    f"Failed to connect to FPA Engine at {self.base_url}: {e}"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise last_error
                
            except httpx.TimeoutException as e:
                last_error = FPAEngineConnectionError(
                    f"Request to FPA Engine timed out after {self.timeout}s: {e}"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise last_error
        
        raise last_error or FPAEngineError("Unknown error")


    # ==================== Health Check ====================
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check if the FPA Engine is healthy.
        
        Returns:
            Health status dictionary
        """
        return await self._request("GET", "/api/health")
    
    # ==================== P&L Calculations ====================
    
    async def calculate_pnl(
        self,
        user_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Calculate P&L statement for a date range.
        
        Args:
            user_id: User UUID
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            P&L report with revenue, cogs, gross_profit, operating_costs, net_profit
        """
        return await self._request(
            "POST",
            "/api/pnl/calculate",
            json_data={
                "userId": str(user_id),
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat()
            }
        )
    
    # ==================== Cash Flow Forecasting ====================
    
    async def forecast_cash(
        self,
        user_id: str,
        days_ahead: int = 30
    ) -> Dict[str, Any]:
        """
        Forecast cash flow for upcoming days.
        
        Args:
            user_id: User UUID
            days_ahead: Number of days to forecast
            
        Returns:
            Forecast with current_cash, burn_rate, runway_days, forecast_points
        """
        return await self._request(
            "POST",
            "/api/forecast/cash",
            json_data={
                "userId": str(user_id),
                "currentCash": 10000,  # Default value, will be calculated from data
                "daysAhead": days_ahead
            }
        )
    
    # ==================== SKU Analysis ====================
    
    async def analyze_skus(
        self,
        user_id: str,
        sku_ids: Optional[List[str]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Analyze unit economics for SKUs.
        
        Args:
            user_id: User UUID
            sku_ids: Optional list of SKU IDs to analyze
            start_date: Optional start date for analysis
            end_date: Optional end date for analysis
            
        Returns:
            SKU analysis with profit_per_unit, cac, refund_rate, true_roas per SKU
        """
        json_data = {"userId": str(user_id)}
        if sku_ids:
            json_data["skuIds"] = sku_ids
        if start_date and end_date:
            json_data["dateRange"] = {
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat()
            }
        
        return await self._request("POST", "/api/sku/analyze", json_data=json_data)
    
    # ==================== Campaign Ranking ====================
    
    async def get_ranked_campaigns(
        self,
        user_id: str,
        top: int = 5,
        bottom: int = 5,
        gross_margin: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Get ranked campaigns by effective ROAS.
        
        Args:
            user_id: User UUID
            top: Number of top campaigns to return
            bottom: Number of bottom campaigns to return
            gross_margin: Optional gross margin for effective ROAS calculation
            
        Returns:
            Dictionary with top and bottom campaign lists
        """
        params = {
            "user_id": str(user_id),
            "top": top,
            "bottom": bottom
        }
        if gross_margin is not None:
            params["gross_margin"] = gross_margin
        
        return await self._request("GET", "/api/campaigns/ranked", params=params)
    
    async def get_campaign_summary(
        self,
        user_id: str,
        gross_margin: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Get campaign performance summary.
        
        Args:
            user_id: User UUID
            gross_margin: Optional gross margin for calculations
            
        Returns:
            Performance summary with totals and overall metrics
        """
        params = {"user_id": str(user_id)}
        if gross_margin is not None:
            params["gross_margin"] = gross_margin
        
        return await self._request("GET", "/api/campaigns/summary", params=params)
    
    # ==================== What-If Simulations ====================
    
    async def simulate_whatif(
        self,
        user_id: str,
        scenario_type: str,
        **parameters
    ) -> Dict[str, Any]:
        """
        Run a what-if scenario simulation.
        
        Args:
            user_id: User UUID
            scenario_type: Type of scenario (AD_SPEND_CHANGE, PRICE_CHANGE, INVENTORY_ORDER, OPTIMAL_PRICE)
            **parameters: Scenario-specific parameters
            
        Returns:
            Simulation result with baseline, projected, impact, and recommendations
        """
        json_data = {
            "userId": str(user_id),
            "scenarioType": scenario_type,
            **parameters
        }
        
        return await self._request("POST", "/api/whatif/simulate", json_data=json_data)
    
    async def simulate_ad_spend_change(
        self,
        user_id: str,
        change_percent: float
    ) -> Dict[str, Any]:
        """
        Simulate changing ad spend by a percentage.
        
        Args:
            user_id: User UUID
            change_percent: Percentage change (e.g., -20 for 20% decrease)
            
        Returns:
            Simulation result showing cascading effects
        """
        return await self._request(
            "POST",
            "/api/whatif/ad-spend",
            json_data={
                "userId": str(user_id),
                "changePercent": change_percent
            }
        )
    
    async def simulate_price_change(
        self,
        user_id: str,
        sku_id: str,
        change_percent: float,
        elasticity: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Simulate changing price for a SKU.
        
        Args:
            user_id: User UUID
            sku_id: SKU UUID
            change_percent: Percentage change (e.g., 10 for 10% increase)
            elasticity: Optional price elasticity coefficient
            
        Returns:
            Simulation result showing profit impact
        """
        json_data = {
            "userId": str(user_id),
            "skuId": str(sku_id),
            "changePercent": change_percent
        }
        if elasticity is not None:
            json_data["elasticity"] = elasticity
        
        return await self._request("POST", "/api/whatif/price", json_data=json_data)
    
    async def simulate_inventory_order(
        self,
        user_id: str,
        sku_id: str,
        units: int
    ) -> Dict[str, Any]:
        """
        Simulate ordering additional inventory.
        
        Args:
            user_id: User UUID
            sku_id: SKU UUID
            units: Number of units to order
            
        Returns:
            Simulation result with cash outflow, projected revenue, break-even
        """
        return await self._request(
            "POST",
            "/api/whatif/inventory",
            json_data={
                "userId": str(user_id),
                "skuId": str(sku_id),
                "units": units
            }
        )
    
    async def find_optimal_price(
        self,
        user_id: str,
        sku_id: str,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        elasticity: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Find optimal price for a SKU.
        
        Args:
            user_id: User UUID
            sku_id: SKU UUID
            min_price: Optional minimum price constraint
            max_price: Optional maximum price constraint
            elasticity: Optional price elasticity coefficient
            
        Returns:
            Optimization result with optimal price and expected profit
        """
        json_data = {
            "userId": str(user_id),
            "skuId": str(sku_id)
        }
        if min_price is not None:
            json_data["minPrice"] = min_price
        if max_price is not None:
            json_data["maxPrice"] = max_price
        if elasticity is not None:
            json_data["elasticity"] = elasticity
        
        return await self._request("POST", "/api/whatif/optimal-price", json_data=json_data)


# Global client instance
_client: Optional[FPAEngineClient] = None


def get_fpa_client() -> FPAEngineClient:
    """Get the global FPA Engine client instance."""
    global _client
    if _client is None:
        _client = FPAEngineClient()
    return _client


async def close_fpa_client():
    """Close the global FPA Engine client."""
    global _client
    if _client:
        await _client.close()
        _client = None


# ==================== Convenience Functions ====================

async def calculate_pnl(user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
    """Calculate P&L statement for a date range."""
    return await get_fpa_client().calculate_pnl(user_id, start_date, end_date)


async def forecast_cash(user_id: str, days_ahead: int = 30) -> Dict[str, Any]:
    """Forecast cash flow for upcoming days."""
    return await get_fpa_client().forecast_cash(user_id, days_ahead)


async def analyze_skus(user_id: str, sku_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """Analyze unit economics for SKUs."""
    return await get_fpa_client().analyze_skus(user_id, sku_ids)


async def get_ranked_campaigns(user_id: str, limit: int = 10) -> Dict[str, Any]:
    """Get ranked campaigns by effective ROAS."""
    return await get_fpa_client().get_ranked_campaigns(user_id, top=limit, bottom=limit)


async def simulate_whatif(user_id: str, scenario: Dict[str, Any]) -> Dict[str, Any]:
    """Run a what-if scenario simulation."""
    scenario_type = scenario.get("scenario_type", scenario.get("scenarioType", ""))
    return await get_fpa_client().simulate_whatif(user_id, scenario_type, **scenario)
