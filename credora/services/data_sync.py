"""
Data Sync Service for Credora FP&A Engine.

This service handles:
1. Fetching raw data from platforms via FastMCP servers
2. Normalizing data using platform-specific normalizers
3. Storing normalized data in the database
4. Triggering FPA Engine computations
5. Caching computed results

Requirements: Architecture Phase 1 - Data Ingestion Pipeline
"""

import asyncio
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
import uuid

from credora.database.connection import get_database, Database
from credora.mcp_servers.fastmcp.token_manager import get_token_manager
from credora.normalization.normalizer import get_normalizer
from credora.normalization.models import NormalizedTransaction, TransactionType
from credora.tools.mcp_router import MCPRouter, get_mcp_router


class DataSyncService:
    """Service for syncing platform data to the database.
    
    This service orchestrates the complete data pipeline:
    1. Fetch data from platforms → 2. Normalize → 3. Store in DB → 4. Compute metrics
    """
    
    def __init__(
        self, 
        database: Optional[Database] = None,
        mcp_router: Optional[MCPRouter] = None,
    ):
        """Initialize the data sync service.
        
        Args:
            database: Database instance (uses global if not provided)
            mcp_router: MCP router instance (uses global if not provided)
        """
        self._db = database
        self._mcp_router = mcp_router
    
    async def _get_db(self) -> Database:
        """Get database instance."""
        if self._db is None:
            self._db = get_database()
            if not self._db.is_connected:
                await self._db.connect()
        return self._db
    
    def _get_router(self) -> MCPRouter:
        """Get MCP router instance."""
        if self._mcp_router is None:
            self._mcp_router = get_mcp_router()
        return self._mcp_router
    
    async def _get_user_uuid(self, external_id: str) -> Optional[str]:
        """Get internal user UUID from external ID (email).
        
        Args:
            external_id: User's external ID (email)
            
        Returns:
            User's internal UUID or None if not found
        """
        db = await self._get_db()
        result = await db.fetchval(
            "SELECT id FROM users WHERE external_id = $1",
            external_id
        )
        return str(result) if result else None
    
    async def _ensure_user_uuid(self, external_id: str) -> str:
        """Get or create user UUID.
        
        Args:
            external_id: User's external ID (email)
            
        Returns:
            User's internal UUID
        """
        db = await self._get_db()
        
        # Try to get existing
        user_uuid = await self._get_user_uuid(external_id)
        if user_uuid:
            return user_uuid
        
        # Create new user
        await db.execute(
            """
            INSERT INTO users (external_id, email, created_at, updated_at)
            VALUES ($1, $1, NOW(), NOW())
            ON CONFLICT (external_id) DO NOTHING
            """,
            external_id
        )
        
        # Get the UUID
        user_uuid = await self._get_user_uuid(external_id)
        if not user_uuid:
            raise ValueError(f"Failed to create user for {external_id}")
        return user_uuid
    
    async def sync_platform(
        self,
        user_id: str,
        platform: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Sync data from a single platform.
        
        Args:
            user_id: User's external ID (email)
            platform: Platform name (shopify, meta, google)
            date_from: Start date for data fetch
            date_to: End date for data fetch
            
        Returns:
            Summary of synced data
        """
        platform = platform.lower()
        
        # Default date range: last 30 days
        if date_to is None:
            date_to = date.today()
        if date_from is None:
            date_from = date_to - timedelta(days=30)
        
        date_from_str = date_from.isoformat()
        date_to_str = date_to.isoformat()
        
        result = {
            "platform": platform,
            "transactions_synced": 0,
            "products_synced": 0,
            "campaigns_synced": 0,
            "errors": [],
        }
        
        try:
            if platform == "shopify":
                result = await self._sync_shopify(user_id, date_from_str, date_to_str)
            elif platform == "meta":
                result = await self._sync_meta(user_id, date_from_str, date_to_str)
            elif platform == "google":
                result = await self._sync_google(user_id, date_from_str, date_to_str)
            else:
                result["errors"].append(f"Unsupported platform: {platform}")
        except Exception as e:
            result["errors"].append(str(e))
        
        return result
    
    async def _sync_shopify(
        self,
        user_id: str,
        date_from: str,
        date_to: str,
    ) -> Dict[str, Any]:
        """Sync Shopify orders, products, and customers.
        
        Args:
            user_id: User's external ID
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            
        Returns:
            Sync result summary
        """
        router = self._get_router()
        normalizer = get_normalizer("shopify")
        db = await self._get_db()
        user_uuid = await self._ensure_user_uuid(user_id)
        
        result = {
            "platform": "shopify",
            "transactions_synced": 0,
            "products_synced": 0,
            "campaigns_synced": 0,
            "errors": [],
        }
        
        # Fetch orders
        try:
            orders = await router.fetch_orders(
                user_id=user_id,
                platform="shopify",
                date_from=date_from,
                date_to=date_to,
                limit=250,  # Shopify max per page
            )
            
            # Normalize and insert orders
            for order_data in orders:
                try:
                    normalized = normalizer.normalize(order_data)
                    await self._insert_transaction(user_uuid, normalized)
                    result["transactions_synced"] += 1
                except Exception as e:
                    result["errors"].append(f"Order {order_data.get('id', 'unknown')}: {str(e)}")
                    
        except Exception as e:
            result["errors"].append(f"Failed to fetch orders: {str(e)}")
        
        # Fetch products
        try:
            products = await router.fetch_products(
                user_id=user_id,
                platform="shopify",
                limit=250,
            )
            
            for product_data in products:
                try:
                    await self._upsert_product(user_uuid, "shopify", product_data)
                    result["products_synced"] += 1
                except Exception as e:
                    result["errors"].append(f"Product {product_data.get('id', 'unknown')}: {str(e)}")
                    
        except Exception as e:
            result["errors"].append(f"Failed to fetch products: {str(e)}")
        
        return result
    
    async def _sync_meta(
        self,
        user_id: str,
        date_from: str,
        date_to: str,
    ) -> Dict[str, Any]:
        """Sync Meta Ads campaigns and spend.
        
        Args:
            user_id: User's external ID
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            
        Returns:
            Sync result summary
        """
        router = self._get_router()
        normalizer = get_normalizer("meta")
        db = await self._get_db()
        user_uuid = await self._ensure_user_uuid(user_id)
        
        result = {
            "platform": "meta",
            "transactions_synced": 0,
            "products_synced": 0,
            "campaigns_synced": 0,
            "errors": [],
        }
        
        # Get ad accounts first
        try:
            ad_accounts = await router.fetch_ad_accounts(
                user_id=user_id,
                platform="meta",
            )
            
            for account in ad_accounts:
                account_id = account.get("id", account.get("account_id", ""))
                
                # Fetch campaigns for each account
                try:
                    campaigns = await router.fetch_campaigns(
                        user_id=user_id,
                        platform="meta",
                        account_id=account_id,
                        date_from=date_from,
                        date_to=date_to,
                    )
                    
                    for campaign_data in campaigns:
                        try:
                            # Store campaign
                            await self._upsert_campaign(user_uuid, "meta", campaign_data)
                            result["campaigns_synced"] += 1
                            
                            # Normalize spend as transaction
                            normalized = normalizer.normalize(campaign_data)
                            await self._insert_transaction(user_uuid, normalized)
                            result["transactions_synced"] += 1
                            
                        except Exception as e:
                            result["errors"].append(f"Campaign {campaign_data.get('id', 'unknown')}: {str(e)}")
                            
                except Exception as e:
                    result["errors"].append(f"Account {account_id}: {str(e)}")
                    
        except Exception as e:
            result["errors"].append(f"Failed to fetch ad accounts: {str(e)}")
        
        return result
    
    async def _sync_google(
        self,
        user_id: str,
        date_from: str,
        date_to: str,
    ) -> Dict[str, Any]:
        """Sync Google Ads campaigns and spend.
        
        Args:
            user_id: User's external ID
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            
        Returns:
            Sync result summary
        """
        router = self._get_router()
        normalizer = get_normalizer("google")
        db = await self._get_db()
        user_uuid = await self._ensure_user_uuid(user_id)
        
        result = {
            "platform": "google",
            "transactions_synced": 0,
            "products_synced": 0,
            "campaigns_synced": 0,
            "errors": [],
        }
        
        # Get customer accounts first
        try:
            customers = await router.fetch_ad_accounts(
                user_id=user_id,
                platform="google",
            )
            
            for customer in customers:
                customer_id = customer.get("id", customer.get("customer_id", ""))
                
                # Fetch campaigns for each customer
                try:
                    campaigns = await router.fetch_campaigns(
                        user_id=user_id,
                        platform="google",
                        account_id=customer_id,
                        date_from=date_from,
                        date_to=date_to,
                    )
                    
                    for campaign_data in campaigns:
                        try:
                            # Store campaign
                            await self._upsert_campaign(user_uuid, "google", campaign_data)
                            result["campaigns_synced"] += 1
                            
                            # Normalize spend as transaction
                            normalized = normalizer.normalize(campaign_data)
                            await self._insert_transaction(user_uuid, normalized)
                            result["transactions_synced"] += 1
                            
                        except Exception as e:
                            result["errors"].append(f"Campaign {campaign_data.get('id', 'unknown')}: {str(e)}")
                            
                except Exception as e:
                    result["errors"].append(f"Customer {customer_id}: {str(e)}")
                    
        except Exception as e:
            result["errors"].append(f"Failed to fetch customers: {str(e)}")
        
        return result
    
    async def _insert_transaction(
        self,
        user_uuid: str,
        transaction: NormalizedTransaction,
    ) -> None:
        """Insert a normalized transaction into the database.
        
        Args:
            user_uuid: User's internal UUID
            transaction: Normalized transaction data
        """
        db = await self._get_db()
        
        # Map transaction type to database value
        type_mapping = {
            TransactionType.ORDER: "order",
            TransactionType.REFUND: "refund",
            TransactionType.AD_SPEND: "ad_spend",
            TransactionType.EXPENSE: "expense",
            TransactionType.PAYOUT: "payout",
            TransactionType.INVENTORY_COST: "inventory_cost",
        }
        
        tx_type = type_mapping.get(transaction.type, "order")
        
        await db.execute(
            """
            INSERT INTO transactions (
                user_id, platform, platform_id, type, amount, currency, 
                amount_usd, quantity, occurred_at, metadata, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT DO NOTHING
            """,
            uuid.UUID(user_uuid),
            transaction.platform,
            transaction.platform_id,
            tx_type,
            float(transaction.amount),
            transaction.currency,
            float(transaction.amount_usd) if transaction.amount_usd else float(transaction.amount),
            transaction.quantity,
            transaction.occurred_at,
            None,  # metadata - can be populated later
        )
    
    async def _upsert_product(
        self,
        user_uuid: str,
        platform: str,
        product_data: Dict[str, Any],
    ) -> None:
        """Upsert a product into the database.
        
        Args:
            user_uuid: User's internal UUID
            platform: Platform name
            product_data: Raw product data from platform
        """
        db = await self._get_db()
        
        product_id = str(product_data.get("id", ""))
        sku = product_data.get("sku", product_data.get("variants", [{}])[0].get("sku", "") if product_data.get("variants") else "")
        name = product_data.get("title", product_data.get("name", "Unknown"))
        
        # Extract price from variants if available
        price = None
        if product_data.get("variants"):
            first_variant = product_data["variants"][0]
            price = first_variant.get("price")
        elif product_data.get("price"):
            price = product_data["price"]
        
        await db.execute(
            """
            INSERT INTO products (
                user_id, platform, platform_product_id, sku, name, 
                selling_price, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (user_id, platform, platform_product_id) 
            DO UPDATE SET
                sku = EXCLUDED.sku,
                name = EXCLUDED.name,
                selling_price = EXCLUDED.selling_price,
                updated_at = NOW()
            """,
            uuid.UUID(user_uuid),
            platform,
            product_id,
            sku,
            name,
            float(price) if price else None,
        )
    
    async def _upsert_campaign(
        self,
        user_uuid: str,
        platform: str,
        campaign_data: Dict[str, Any],
    ) -> None:
        """Upsert a campaign into the database.
        
        Args:
            user_uuid: User's internal UUID
            platform: Platform name
            campaign_data: Raw campaign data from platform
        """
        db = await self._get_db()
        
        campaign_id = str(campaign_data.get("id", campaign_data.get("campaign_id", "")))
        name = campaign_data.get("name", campaign_data.get("campaign_name", "Unknown"))
        status = campaign_data.get("status", campaign_data.get("effective_status", "unknown"))
        
        # Extract metrics
        spend = campaign_data.get("spend", campaign_data.get("cost_micros", 0))
        if campaign_data.get("cost_micros"):
            spend = float(spend) / 1_000_000  # Convert micros
        
        impressions = int(campaign_data.get("impressions", 0))
        clicks = int(campaign_data.get("clicks", 0))
        conversions = int(campaign_data.get("conversions", campaign_data.get("actions", 0)))
        
        await db.execute(
            """
            INSERT INTO campaigns (
                user_id, platform, platform_campaign_id, name, status,
                spend, impressions, clicks, conversions, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            ON CONFLICT (user_id, platform, platform_campaign_id)
            DO UPDATE SET
                name = EXCLUDED.name,
                status = EXCLUDED.status,
                spend = EXCLUDED.spend,
                impressions = EXCLUDED.impressions,
                clicks = EXCLUDED.clicks,
                conversions = EXCLUDED.conversions,
                updated_at = NOW()
            """,
            uuid.UUID(user_uuid),
            platform,
            campaign_id,
            name,
            status.lower() if isinstance(status, str) else "unknown",
            float(spend) if spend else 0.0,
            impressions,
            clicks,
            conversions,
        )
    
    async def sync_all_platforms(
        self,
        user_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Sync data from all connected platforms.
        
        Args:
            user_id: User's external ID (email)
            date_from: Start date for data fetch
            date_to: End date for data fetch
            
        Returns:
            Combined summary of all synced data
        """
        # Get connected platforms from FastMCP token manager
        token_manager = get_token_manager()
        connected_platforms = await token_manager.list_platforms(user_id)
        
        results = {
            "user_id": user_id,
            "platforms_synced": [],
            "total_transactions": 0,
            "total_products": 0,
            "total_campaigns": 0,
            "errors": [],
        }
        
        for platform in connected_platforms:
            platform_result = await self.sync_platform(
                user_id=user_id,
                platform=platform,
                date_from=date_from,
                date_to=date_to,
            )
            
            results["platforms_synced"].append(platform)
            results["total_transactions"] += platform_result.get("transactions_synced", 0)
            results["total_products"] += platform_result.get("products_synced", 0)
            results["total_campaigns"] += platform_result.get("campaigns_synced", 0)
            results["errors"].extend(platform_result.get("errors", []))
        
        return results


# Global service instance
_data_sync_service: Optional[DataSyncService] = None


def get_data_sync_service() -> DataSyncService:
    """Get the global data sync service instance.
    
    Returns:
        DataSyncService instance
    """
    global _data_sync_service
    if _data_sync_service is None:
        _data_sync_service = DataSyncService()
    return _data_sync_service


async def sync_platform(
    user_id: str,
    platform: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Dict[str, Any]:
    """Convenience function to sync a single platform.
    
    Args:
        user_id: User's external ID (email)
        platform: Platform name (shopify, meta, google)
        date_from: Start date for data fetch
        date_to: End date for data fetch
        
    Returns:
        Sync result summary
    """
    service = get_data_sync_service()
    return await service.sync_platform(user_id, platform, date_from, date_to)


async def sync_all_platforms(
    user_id: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Dict[str, Any]:
    """Convenience function to sync all platforms.
    
    Args:
        user_id: User's external ID (email)
        date_from: Start date for data fetch
        date_to: End date for data fetch
        
    Returns:
        Combined sync result summary
    """
    service = get_data_sync_service()
    return await service.sync_all_platforms(user_id, date_from, date_to)


__all__ = [
    "DataSyncService",
    "get_data_sync_service",
    "sync_platform",
    "sync_all_platforms",
]
