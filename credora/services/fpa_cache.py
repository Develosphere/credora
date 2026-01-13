"""
FPA Cache Service for Credora FP&A Engine.

This service handles:
1. Caching computed P&L, forecasts, and other FPA results in the database
2. Checking cache freshness before calling Java engine
3. Storing new computations back to database

Requirements: Architecture Phase 2 - Database Caching for FPA
"""

import asyncio
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
import httpx
import os

from credora.database.connection import get_database, Database


# Cache TTL settings (in hours)
PNL_CACHE_TTL_HOURS = 1
FORECAST_CACHE_TTL_HOURS = 1
CAMPAIGN_CACHE_TTL_HOURS = 0.5  # 30 minutes

# Java FPA Engine URL
JAVA_ENGINE_URL = os.environ.get("JAVA_ENGINE_URL", "http://localhost:8081")


class FPACacheService:
    """Service for caching FPA computations in the database.
    
    Implements read-through caching:
    1. Check database for cached result
    2. If fresh, return cached
    3. If stale or missing, compute via Java engine
    4. Store result in database
    5. Return result
    """
    
    def __init__(self, database: Optional[Database] = None):
        """Initialize the FPA cache service.
        
        Args:
            database: Database instance (uses global if not provided)
        """
        self._db = database
    
    async def _get_db(self) -> Database:
        """Get database instance."""
        if self._db is None:
            self._db = get_database()
            if not self._db.is_connected:
                await self._db.connect()
        return self._db
    
    async def _get_user_uuid(self, external_id: str) -> Optional[str]:
        """Get internal user UUID from external ID or email."""
        db = await self._get_db()
        # Try external_id first, then email
        result = await db.fetchval(
            "SELECT id FROM users WHERE external_id = $1 OR email = $1",
            external_id
        )
        return str(result) if result else None
    
    async def get_pnl(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Get P&L statement, using cache if available.
        
        Args:
            user_id: User's external ID (email)
            start_date: Start of date range
            end_date: End of date range
            force_refresh: If True, skip cache and compute fresh
            
        Returns:
            P&L report data
        """
        user_uuid = await self._get_user_uuid(user_id)
        if not user_uuid:
            # No user found in DB, compute with email (will use mock data)
            return await self._compute_pnl_from_engine(user_id, start_date, end_date)
        
        db = await self._get_db()
        
        # Check cache
        if not force_refresh:
            cached = await db.fetchrow(
                """
                SELECT * FROM pnl_reports
                WHERE user_id = $1 AND start_date = $2 AND end_date = $3
                AND calculated_at > NOW() - INTERVAL '%s hours'
                ORDER BY calculated_at DESC
                LIMIT 1
                """ % PNL_CACHE_TTL_HOURS,
                uuid.UUID(user_uuid),
                start_date,
                end_date,
            )
            
            if cached:
                return self._row_to_pnl_dict(cached)
        
        # Compute fresh - pass the actual UUID to Java engine
        result = await self._compute_pnl_from_engine(user_uuid, start_date, end_date)
        
        # Store in cache
        await self._store_pnl_cache(user_uuid, start_date, end_date, result)
        
        return result
    
    def _row_to_pnl_dict(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert database row to P&L dict."""
        return {
            "userId": str(row.get("user_id", "")),
            "startDate": row["start_date"].isoformat() if row.get("start_date") else None,
            "endDate": row["end_date"].isoformat() if row.get("end_date") else None,
            "revenue": float(row.get("revenue", 0) or 0),
            "refunds": float(row.get("refunds", 0) or 0),
            "netRevenue": float(row.get("net_revenue", 0) or 0),
            "cogs": float(row.get("cogs", 0) or 0),
            "grossProfit": float(row.get("gross_profit", 0) or 0),
            "adSpend": float(row.get("ad_spend", 0) or 0),
            "otherExpenses": float(row.get("other_expenses", 0) or 0),
            "operatingCosts": float(row.get("operating_costs", 0) or 0),
            "netProfit": float(row.get("net_profit", 0) or 0),
            "grossMargin": float(row.get("gross_margin", 0) or 0) * 100,
            "netMargin": float(row.get("net_margin", 0) or 0) * 100,
            "cached": True,
            "cachedAt": row["calculated_at"].isoformat() if row.get("calculated_at") else None,
        }
    
    async def _compute_pnl_from_engine(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
    ) -> Dict[str, Any]:
        """Compute P&L from Java FPA Engine."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{JAVA_ENGINE_URL}/api/pnl/calculate",
                    json={
                        "userId": user_id,
                        "startDate": start_date.isoformat(),
                        "endDate": end_date.isoformat(),
                    },
                )
                response.raise_for_status()
                data = response.json()
                data["cached"] = False
                return data
        except Exception as e:
            # Return mock data if Java engine unavailable
            return {
                "userId": user_id,
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "revenue": 125000.00,
                "refunds": 2500.00,
                "netRevenue": 122500.00,
                "cogs": 48000.00,
                "grossProfit": 74500.00,
                "adSpend": 35000.00,
                "otherExpenses": 12000.00,
                "operatingCosts": 47000.00,
                "netProfit": 27500.00,
                "grossMargin": 60.82,
                "netMargin": 22.45,
                "cached": False,
                "error": str(e),
            }
    
    async def _store_pnl_cache(
        self,
        user_uuid: str,
        start_date: date,
        end_date: date,
        data: Dict[str, Any],
    ) -> None:
        """Store P&L result in cache."""
        db = await self._get_db()
        
        try:
            await db.execute(
                """
                INSERT INTO pnl_reports (
                    user_id, start_date, end_date, revenue, refunds, net_revenue,
                    cogs, gross_profit, ad_spend, other_expenses, operating_costs,
                    net_profit, gross_margin, net_margin, calculated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                ON CONFLICT (user_id, start_date, end_date)
                DO UPDATE SET
                    revenue = EXCLUDED.revenue,
                    refunds = EXCLUDED.refunds,
                    net_revenue = EXCLUDED.net_revenue,
                    cogs = EXCLUDED.cogs,
                    gross_profit = EXCLUDED.gross_profit,
                    ad_spend = EXCLUDED.ad_spend,
                    other_expenses = EXCLUDED.other_expenses,
                    operating_costs = EXCLUDED.operating_costs,
                    net_profit = EXCLUDED.net_profit,
                    gross_margin = EXCLUDED.gross_margin,
                    net_margin = EXCLUDED.net_margin,
                    calculated_at = NOW()
                """,
                uuid.UUID(user_uuid),
                start_date,
                end_date,
                data.get("revenue", 0),
                data.get("refunds", 0),
                data.get("netRevenue", data.get("net_revenue", 0)),
                data.get("cogs", 0),
                data.get("grossProfit", data.get("gross_profit", 0)),
                data.get("adSpend", data.get("ad_spend", 0)),
                data.get("otherExpenses", data.get("other_expenses", 0)),
                data.get("operatingCosts", data.get("operating_costs", 0)),
                data.get("netProfit", data.get("net_profit", 0)),
                (data.get("grossMargin", 0) or 0) / 100,  # Store as decimal
                (data.get("netMargin", 0) or 0) / 100,
            )
        except Exception as e:
            print(f"Failed to cache P&L: {e}")
    
    async def get_forecast(
        self,
        user_id: str,
        days_ahead: int = 30,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Get cash flow forecast, using cache if available.
        
        Args:
            user_id: User's external ID (email)
            days_ahead: Number of days to forecast
            force_refresh: If True, skip cache and compute fresh
            
        Returns:
            Forecast report data
        """
        user_uuid = await self._get_user_uuid(user_id)
        if not user_uuid:
            return await self._compute_forecast_from_engine(user_id, days_ahead)
        
        db = await self._get_db()
        forecast_date = date.today()
        
        # Check cache
        if not force_refresh:
            cached = await db.fetchrow(
                """
                SELECT * FROM forecasts
                WHERE user_id = $1 AND forecast_date = $2 AND forecast_days = $3
                AND created_at > NOW() - INTERVAL '%s hours'
                ORDER BY created_at DESC
                LIMIT 1
                """ % FORECAST_CACHE_TTL_HOURS,
                uuid.UUID(user_uuid),
                forecast_date,
                days_ahead,
            )
            
            if cached:
                return self._row_to_forecast_dict(cached)
        
        # Compute fresh - pass the actual UUID to Java engine
        result = await self._compute_forecast_from_engine(user_uuid, days_ahead)
        
        # Store in cache
        await self._store_forecast_cache(user_uuid, forecast_date, days_ahead, result)
        
        return result
    
    def _row_to_forecast_dict(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert database row to forecast dict."""
        # Handle forecast_points which might be stored as JSON string
        forecast_points = row.get("forecast_points", [])
        if isinstance(forecast_points, str):
            try:
                import json
                forecast_points = json.loads(forecast_points)
            except:
                forecast_points = []
        if not isinstance(forecast_points, list):
            forecast_points = []
            
        return {
            "currentCash": float(row.get("current_cash", 50000) or 50000),
            "burnRate": float(row.get("burn_rate", 1500) or 1500),
            "runwayDays": row.get("runway_days", 45),
            "lowScenario": float(row.get("low_scenario", 0) or 0),
            "midScenario": float(row.get("mid_scenario", 0) or 0),
            "highScenario": float(row.get("high_scenario", 0) or 0),
            "forecastPoints": forecast_points,
            "cached": True,
            "cachedAt": row["created_at"].isoformat() if row.get("created_at") else None,
        }
    
    async def _compute_forecast_from_engine(
        self,
        user_id: str,
        days_ahead: int,
    ) -> Dict[str, Any]:
        """Compute forecast from Java FPA Engine."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{JAVA_ENGINE_URL}/api/forecast/cash",
                    json={
                        "userId": user_id,
                        "daysAhead": days_ahead,
                        "currentCash": 50000.0,
                    },
                )
                response.raise_for_status()
                data = response.json()
                
                # Get forecast points, ensure it's a list
                forecast_points = data.get("dailyForecasts", [])
                if not isinstance(forecast_points, list):
                    forecast_points = []
                
                # Transform to frontend format
                return {
                    "currentCash": data.get("currentCash", 50000.0),
                    "burnRate": data.get("dailyBurnRate", 1500.0),
                    "runwayDays": data.get("runwayDays", 45),
                    "lowScenario": data.get("pessimisticEndCash", 0),
                    "midScenario": data.get("expectedEndCash", 0),
                    "highScenario": data.get("optimisticEndCash", 0),
                    "forecastPoints": forecast_points,
                    "cached": False,
                }
        except Exception as e:
            # Return mock data if Java engine unavailable
            return self._generate_mock_forecast(days_ahead, str(e))
    
    def _generate_mock_forecast(self, days: int, error: str = None) -> Dict[str, Any]:
        """Generate mock forecast data."""
        base_date = date.today()
        current_cash = 50000.0
        forecast_points = []
        
        for i in range(days):
            forecast_date = base_date + timedelta(days=i)
            low = current_cash - (i * 800)
            mid = current_cash - (i * 500)
            high = current_cash - (i * 200)
            forecast_points.append({
                "date": forecast_date.isoformat(),
                "low": max(0, low),
                "mid": max(0, mid),
                "high": max(0, high),
            })
        
        result = {
            "currentCash": current_cash,
            "burnRate": 1500.00,
            "runwayDays": 45,
            "lowScenario": max(0, current_cash - (days * 800)),
            "midScenario": max(0, current_cash - (days * 500)),
            "highScenario": max(0, current_cash - (days * 200)),
            "forecastPoints": forecast_points,
            "cached": False,
        }
        if error:
            result["error"] = error
        return result
    
    async def _store_forecast_cache(
        self,
        user_uuid: str,
        forecast_date: date,
        days_ahead: int,
        data: Dict[str, Any],
    ) -> None:
        """Store forecast result in cache."""
        db = await self._get_db()
        
        try:
            await db.execute(
                """
                INSERT INTO forecasts (
                    user_id, forecast_date, forecast_days, current_cash, burn_rate,
                    runway_days, low_scenario, mid_scenario, high_scenario,
                    forecast_points, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
                """,
                uuid.UUID(user_uuid),
                forecast_date,
                days_ahead,
                data.get("currentCash", 50000),
                data.get("burnRate", 1500),
                data.get("runwayDays", 45),
                data.get("lowScenario", 0),
                data.get("midScenario", 0),
                data.get("highScenario", 0),
                str(data.get("forecastPoints", [])).replace("'", '"'),  # Convert to JSON
            )
        except Exception as e:
            print(f"Failed to cache forecast: {e}")


# Global service instance
_fpa_cache_service: Optional[FPACacheService] = None


def get_fpa_cache_service() -> FPACacheService:
    """Get the global FPA cache service instance."""
    global _fpa_cache_service
    if _fpa_cache_service is None:
        _fpa_cache_service = FPACacheService()
    return _fpa_cache_service


async def get_cached_pnl(
    user_id: str,
    start_date: date,
    end_date: date,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """Get P&L with caching."""
    service = get_fpa_cache_service()
    return await service.get_pnl(user_id, start_date, end_date, force_refresh)


async def get_cached_forecast(
    user_id: str,
    days_ahead: int = 30,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """Get forecast with caching."""
    service = get_fpa_cache_service()
    return await service.get_forecast(user_id, days_ahead, force_refresh)


__all__ = [
    "FPACacheService",
    "get_fpa_cache_service",
    "get_cached_pnl",
    "get_cached_forecast",
]
