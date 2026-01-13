"""Data normalization module for Credora FP&A Engine.

Provides unified transaction format across all platforms (Shopify, Meta, Google).

Requirements: 2.1, 2.2, 2.3
"""

from credora.normalization.models import NormalizedTransaction, TransactionType
from credora.normalization.normalizer import (
    Normalizer,
    ShopifyNormalizer,
    MetaNormalizer,
    GoogleNormalizer,
    get_normalizer,
)
from credora.normalization.currency import CurrencyConverter

__all__ = [
    "NormalizedTransaction",
    "TransactionType",
    "Normalizer",
    "ShopifyNormalizer",
    "MetaNormalizer",
    "GoogleNormalizer",
    "get_normalizer",
    "CurrencyConverter",
]
