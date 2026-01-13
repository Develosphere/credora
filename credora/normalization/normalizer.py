"""Platform-specific normalizers for Credora FP&A Engine.

Requirements: 2.1, 2.2, 2.3
"""

from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from credora.normalization.models import NormalizedTransaction, TransactionType


class Normalizer(ABC):
    """Abstract base class for platform normalizers.
    
    Requirements: 2.1, 2.2, 2.3
    """
    
    @property
    @abstractmethod
    def platform(self) -> str:
        """Return the platform name."""
        pass
    
    @abstractmethod
    def normalize(self, data: Dict[str, Any]) -> NormalizedTransaction:
        """Normalize a single platform record to unified format.
        
        Args:
            data: Platform-specific data dictionary
            
        Returns:
            NormalizedTransaction instance
        """
        pass
    
    def normalize_batch(self, records: List[Dict[str, Any]]) -> List[NormalizedTransaction]:
        """Normalize multiple records.
        
        Args:
            records: List of platform-specific data dictionaries
            
        Returns:
            List of NormalizedTransaction instances
        """
        return [self.normalize(record) for record in records]


class ShopifyNormalizer(Normalizer):
    """Normalizer for Shopify order and refund data.
    
    Requirements: 2.1
    
    Transforms Shopify order data to unified format with fields:
    id, platform, type, amount, currency, timestamp, sku_id, quantity, cost
    """
    
    @property
    def platform(self) -> str:
        return "shopify"
    
    def normalize(self, data: Dict[str, Any]) -> NormalizedTransaction:
        """Normalize Shopify order/refund data.
        
        Expected Shopify order structure:
        {
            "id": "order_123",
            "total_price": "99.99",
            "currency": "USD",
            "created_at": "2024-01-15T10:30:00Z",
            "line_items": [
                {
                    "sku": "SKU-001",
                    "quantity": 2,
                    "price": "49.99"
                }
            ],
            "customer": {"id": "cust_123"},
            "financial_status": "paid"  # or "refunded"
        }
        """
        # Determine transaction type
        financial_status = data.get("financial_status", "paid")
        is_refund = financial_status == "refunded" or data.get("kind") == "refund"
        
        tx_type = TransactionType.REFUND if is_refund else TransactionType.ORDER
        
        # Extract amount
        amount_str = data.get("total_price") or data.get("amount") or "0"
        amount = Decimal(str(amount_str))
        
        # For refunds, amount should be positive (we track it as a separate type)
        if is_refund and amount < 0:
            amount = abs(amount)
        
        # Extract line item info (use first item for SKU if available)
        line_items = data.get("line_items", [])
        sku_id = None
        quantity = None
        cost_per_unit = None
        
        if line_items:
            first_item = line_items[0]
            sku_id = first_item.get("sku") or first_item.get("product_id")
            quantity = first_item.get("quantity")
            # Cost per unit from variant if available
            if "cost_per_item" in first_item:
                cost_per_unit = Decimal(str(first_item["cost_per_item"]))
        
        # Parse timestamp
        timestamp_str = data.get("created_at") or data.get("processed_at")
        if isinstance(timestamp_str, str):
            # Handle various ISO formats
            timestamp_str = timestamp_str.replace("Z", "+00:00")
            timestamp = datetime.fromisoformat(timestamp_str)
        else:
            timestamp = timestamp_str or datetime.now()
        
        # Extract customer ID
        customer = data.get("customer", {})
        customer_id = str(customer.get("id")) if customer.get("id") else None
        
        return NormalizedTransaction(
            id=str(uuid.uuid4()),
            platform=self.platform,
            platform_id=str(data.get("id", "")),
            type=tx_type,
            amount=amount,
            currency=data.get("currency", "USD"),
            timestamp=timestamp,
            sku_id=sku_id,
            quantity=quantity,
            cost_per_unit=cost_per_unit,
            customer_id=customer_id,
            metadata={
                "financial_status": financial_status,
                "order_number": data.get("order_number"),
                "line_items_count": len(line_items),
            }
        )


class MetaNormalizer(Normalizer):
    """Normalizer for Meta (Facebook/Instagram) Ads spend data.
    
    Requirements: 2.2
    
    Transforms Meta Ads spend data to unified format categorized as marketing_expense.
    """
    
    @property
    def platform(self) -> str:
        return "meta"
    
    def normalize(self, data: Dict[str, Any]) -> NormalizedTransaction:
        """Normalize Meta Ads spend data.
        
        Expected Meta Ads structure:
        {
            "id": "campaign_123",
            "campaign_id": "campaign_123",
            "campaign_name": "Summer Sale",
            "spend": "150.50",
            "date_start": "2024-01-15",
            "date_stop": "2024-01-15",
            "impressions": "10000",
            "clicks": "250",
            "conversions": "10"
        }
        """
        # Extract spend amount
        spend_str = data.get("spend") or data.get("amount") or "0"
        amount = Decimal(str(spend_str))
        
        # Parse timestamp
        date_str = data.get("date_start") or data.get("date") or data.get("created_time")
        if isinstance(date_str, str):
            if "T" in date_str:
                date_str = date_str.replace("Z", "+00:00")
                timestamp = datetime.fromisoformat(date_str)
            else:
                timestamp = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            timestamp = date_str or datetime.now()
        
        # Extract campaign info
        campaign_id = data.get("campaign_id") or data.get("id")
        
        return NormalizedTransaction(
            id=str(uuid.uuid4()),
            platform=self.platform,
            platform_id=str(data.get("id", "")),
            type=TransactionType.AD_SPEND,  # Always marketing_expense for Meta
            amount=amount,
            currency=data.get("currency", "USD"),
            timestamp=timestamp,
            campaign_id=str(campaign_id) if campaign_id else None,
            metadata={
                "campaign_name": data.get("campaign_name") or data.get("name"),
                "impressions": data.get("impressions"),
                "clicks": data.get("clicks"),
                "conversions": data.get("conversions"),
                "date_start": data.get("date_start"),
                "date_stop": data.get("date_stop"),
            }
        )


class GoogleNormalizer(Normalizer):
    """Normalizer for Google Ads spend data.
    
    Requirements: 2.3
    
    Transforms Google Ads spend data to unified format categorized as marketing_expense.
    """
    
    @property
    def platform(self) -> str:
        return "google"
    
    def normalize(self, data: Dict[str, Any]) -> NormalizedTransaction:
        """Normalize Google Ads spend data.
        
        Expected Google Ads structure:
        {
            "campaign_id": "123456789",
            "campaign_name": "Search Campaign",
            "cost_micros": "1500000",  # Cost in micros (divide by 1,000,000)
            "date": "2024-01-15",
            "impressions": "5000",
            "clicks": "100",
            "conversions": "5"
        }
        """
        # Extract cost (Google uses micros - divide by 1,000,000)
        cost_micros = data.get("cost_micros") or data.get("cost") or "0"
        if "cost_micros" in data:
            amount = Decimal(str(cost_micros)) / Decimal("1000000")
        else:
            amount = Decimal(str(cost_micros))
        
        # Parse timestamp
        date_str = data.get("date") or data.get("segments", {}).get("date")
        if isinstance(date_str, str):
            if "T" in date_str:
                date_str = date_str.replace("Z", "+00:00")
                timestamp = datetime.fromisoformat(date_str)
            else:
                timestamp = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            timestamp = date_str or datetime.now()
        
        # Extract campaign info
        campaign_id = data.get("campaign_id") or data.get("campaign", {}).get("id")
        
        return NormalizedTransaction(
            id=str(uuid.uuid4()),
            platform=self.platform,
            platform_id=str(data.get("id", campaign_id or "")),
            type=TransactionType.AD_SPEND,  # Always marketing_expense for Google
            amount=amount,
            currency=data.get("currency_code", "USD"),
            timestamp=timestamp,
            campaign_id=str(campaign_id) if campaign_id else None,
            metadata={
                "campaign_name": data.get("campaign_name") or data.get("campaign", {}).get("name"),
                "impressions": data.get("impressions") or data.get("metrics", {}).get("impressions"),
                "clicks": data.get("clicks") or data.get("metrics", {}).get("clicks"),
                "conversions": data.get("conversions") or data.get("metrics", {}).get("conversions"),
                "cost_micros": data.get("cost_micros"),
            }
        )


# Normalizer registry
_NORMALIZERS: Dict[str, Normalizer] = {
    "shopify": ShopifyNormalizer(),
    "meta": MetaNormalizer(),
    "google": GoogleNormalizer(),
}


def get_normalizer(platform: str) -> Normalizer:
    """Get the normalizer for a specific platform.
    
    Args:
        platform: Platform name (shopify, meta, google)
        
    Returns:
        Normalizer instance for the platform
        
    Raises:
        ValueError: If platform is not supported
    """
    platform_lower = platform.lower().strip()
    
    if platform_lower not in _NORMALIZERS:
        raise ValueError(
            f"Unsupported platform: {platform}. "
            f"Supported platforms: {list(_NORMALIZERS.keys())}"
        )
    
    return _NORMALIZERS[platform_lower]


def normalize_transaction(platform: str, data: Dict[str, Any]) -> NormalizedTransaction:
    """Convenience function to normalize a single transaction.
    
    Args:
        platform: Platform name
        data: Platform-specific data
        
    Returns:
        NormalizedTransaction instance
    """
    normalizer = get_normalizer(platform)
    return normalizer.normalize(data)


def normalize_transactions(
    platform: str, 
    records: List[Dict[str, Any]]
) -> List[NormalizedTransaction]:
    """Convenience function to normalize multiple transactions.
    
    Args:
        platform: Platform name
        records: List of platform-specific data
        
    Returns:
        List of NormalizedTransaction instances
    """
    normalizer = get_normalizer(platform)
    return normalizer.normalize_batch(records)
