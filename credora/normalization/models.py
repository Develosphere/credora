"""Normalized transaction models for Credora FP&A Engine.

Requirements: 2.1, 2.2, 2.3
"""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, Dict, Any
import uuid


class TransactionType(str, Enum):
    """Transaction type enumeration."""
    ORDER = "order"
    REFUND = "refund"
    AD_SPEND = "ad_spend"
    EXPENSE = "expense"
    PAYOUT = "payout"
    INVENTORY_COST = "inventory_cost"


@dataclass
class NormalizedTransaction:
    """Unified transaction format across all platforms.
    
    Requirements: 2.1, 2.2, 2.3
    
    Attributes:
        id: Unique transaction identifier
        platform: Source platform (shopify, meta, google)
        platform_id: Original ID from the platform
        type: Transaction type (order, refund, ad_spend, expense, etc.)
        amount: Transaction amount in original currency
        currency: Original currency code (e.g., USD, EUR)
        amount_usd: Amount converted to USD
        timestamp: When the transaction occurred
        sku_id: Associated product/SKU ID (optional)
        quantity: Number of units (for orders)
        cost_per_unit: Cost per unit (for COGS calculation)
        campaign_id: Associated campaign ID (for ad spend)
        customer_id: Customer identifier (optional)
        metadata: Additional platform-specific data
    """
    
    id: str
    platform: str
    platform_id: str
    type: TransactionType
    amount: Decimal
    currency: str
    timestamp: datetime
    amount_usd: Optional[Decimal] = None
    sku_id: Optional[str] = None
    quantity: Optional[int] = None
    cost_per_unit: Optional[Decimal] = None
    campaign_id: Optional[str] = None
    customer_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate and set defaults after initialization."""
        # Generate ID if not provided
        if not self.id:
            self.id = str(uuid.uuid4())
        
        # Normalize platform name
        self.platform = self.platform.lower().strip()
        
        # Set amount_usd to amount if currency is USD and not set
        if self.amount_usd is None and self.currency.upper() == "USD":
            self.amount_usd = self.amount
        
        # Ensure amount is Decimal
        if not isinstance(self.amount, Decimal):
            self.amount = Decimal(str(self.amount))
        
        if self.amount_usd is not None and not isinstance(self.amount_usd, Decimal):
            self.amount_usd = Decimal(str(self.amount_usd))
        
        if self.cost_per_unit is not None and not isinstance(self.cost_per_unit, Decimal):
            self.cost_per_unit = Decimal(str(self.cost_per_unit))
    
    def is_revenue(self) -> bool:
        """Check if this is a revenue transaction."""
        return self.type == TransactionType.ORDER
    
    def is_refund(self) -> bool:
        """Check if this is a refund transaction."""
        return self.type == TransactionType.REFUND
    
    def is_expense(self) -> bool:
        """Check if this is an expense transaction."""
        return self.type in (TransactionType.AD_SPEND, TransactionType.EXPENSE)
    
    def is_marketing_expense(self) -> bool:
        """Check if this is a marketing/ad expense."""
        return self.type == TransactionType.AD_SPEND
    
    def get_effective_amount_usd(self) -> Decimal:
        """Get the USD amount, falling back to original amount."""
        return self.amount_usd if self.amount_usd is not None else self.amount
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "platform": self.platform,
            "platform_id": self.platform_id,
            "type": self.type.value,
            "amount": str(self.amount),
            "currency": self.currency,
            "amount_usd": str(self.amount_usd) if self.amount_usd else None,
            "timestamp": self.timestamp.isoformat(),
            "sku_id": self.sku_id,
            "quantity": self.quantity,
            "cost_per_unit": str(self.cost_per_unit) if self.cost_per_unit else None,
            "campaign_id": self.campaign_id,
            "customer_id": self.customer_id,
            "metadata": self.metadata,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "NormalizedTransaction":
        """Create from dictionary."""
        return cls(
            id=data.get("id", ""),
            platform=data["platform"],
            platform_id=data["platform_id"],
            type=TransactionType(data["type"]),
            amount=Decimal(data["amount"]),
            currency=data["currency"],
            timestamp=datetime.fromisoformat(data["timestamp"]) if isinstance(data["timestamp"], str) else data["timestamp"],
            amount_usd=Decimal(data["amount_usd"]) if data.get("amount_usd") else None,
            sku_id=data.get("sku_id"),
            quantity=data.get("quantity"),
            cost_per_unit=Decimal(data["cost_per_unit"]) if data.get("cost_per_unit") else None,
            campaign_id=data.get("campaign_id"),
            customer_id=data.get("customer_id"),
            metadata=data.get("metadata", {}),
        )
    
    def validate(self) -> bool:
        """Validate that all required fields are present.
        
        Returns:
            True if valid, raises ValueError if invalid
        """
        required_fields = ["id", "platform", "type", "amount", "currency", "timestamp"]
        
        for field_name in required_fields:
            value = getattr(self, field_name, None)
            if value is None or (isinstance(value, str) and not value.strip()):
                raise ValueError(f"Required field '{field_name}' is missing or empty")
        
        # Validate platform
        valid_platforms = ["shopify", "meta", "google"]
        if self.platform not in valid_platforms:
            raise ValueError(f"Invalid platform: {self.platform}. Must be one of: {valid_platforms}")
        
        # Validate amount is positive for most types
        if self.type != TransactionType.REFUND and self.amount < 0:
            raise ValueError(f"Amount must be non-negative for type {self.type}")
        
        return True
