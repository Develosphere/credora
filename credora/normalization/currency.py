"""Currency conversion service for Credora FP&A Engine.

Requirements: 2.4
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional
from datetime import date


# Default exchange rates (USD as base)
# In production, these would be fetched from an API or database
DEFAULT_EXCHANGE_RATES: Dict[str, Decimal] = {
    "USD": Decimal("1.0"),
    "EUR": Decimal("1.08"),      # 1 EUR = 1.08 USD
    "GBP": Decimal("1.27"),      # 1 GBP = 1.27 USD
    "CAD": Decimal("0.74"),      # 1 CAD = 0.74 USD
    "AUD": Decimal("0.65"),      # 1 AUD = 0.65 USD
    "JPY": Decimal("0.0067"),    # 1 JPY = 0.0067 USD
    "INR": Decimal("0.012"),     # 1 INR = 0.012 USD
    "CNY": Decimal("0.14"),      # 1 CNY = 0.14 USD
    "BRL": Decimal("0.20"),      # 1 BRL = 0.20 USD
    "MXN": Decimal("0.058"),     # 1 MXN = 0.058 USD
}


class CurrencyConverter:
    """Currency conversion service.
    
    Requirements: 2.4
    
    Converts amounts to USD using stored exchange rates.
    """
    
    def __init__(self, exchange_rates: Optional[Dict[str, Decimal]] = None):
        """Initialize with exchange rates.
        
        Args:
            exchange_rates: Dictionary mapping currency codes to USD rates.
                           If None, uses default rates.
        """
        self._rates = exchange_rates or DEFAULT_EXCHANGE_RATES.copy()
    
    def get_rate(self, currency: str) -> Optional[Decimal]:
        """Get exchange rate for a currency to USD.
        
        Args:
            currency: Currency code (e.g., "EUR", "GBP")
            
        Returns:
            Exchange rate to USD, or None if not found
        """
        return self._rates.get(currency.upper())
    
    def set_rate(self, currency: str, rate: Decimal) -> None:
        """Set exchange rate for a currency.
        
        Args:
            currency: Currency code
            rate: Exchange rate to USD
        """
        if rate <= 0:
            raise ValueError("Exchange rate must be positive")
        self._rates[currency.upper()] = rate
    
    def convert_to_usd(
        self, 
        amount: Decimal, 
        currency: str,
        round_places: int = 2
    ) -> Decimal:
        """Convert an amount to USD.
        
        Requirements: 2.4
        
        Args:
            amount: Amount in original currency
            currency: Original currency code
            round_places: Decimal places to round to (default 2)
            
        Returns:
            Amount in USD, rounded to specified decimal places
            
        Raises:
            ValueError: If currency is not supported
        """
        currency_upper = currency.upper()
        
        # Already USD
        if currency_upper == "USD":
            return amount.quantize(Decimal(f"0.{'0' * round_places}"), rounding=ROUND_HALF_UP)
        
        # Get exchange rate
        rate = self._rates.get(currency_upper)
        if rate is None:
            raise ValueError(
                f"Unsupported currency: {currency}. "
                f"Supported currencies: {list(self._rates.keys())}"
            )
        
        # Convert: amount_usd = amount * rate
        amount_usd = amount * rate
        
        # Round to specified decimal places
        return amount_usd.quantize(
            Decimal(f"0.{'0' * round_places}"), 
            rounding=ROUND_HALF_UP
        )
    
    def convert_from_usd(
        self,
        amount_usd: Decimal,
        target_currency: str,
        round_places: int = 2
    ) -> Decimal:
        """Convert USD amount to another currency.
        
        Args:
            amount_usd: Amount in USD
            target_currency: Target currency code
            round_places: Decimal places to round to
            
        Returns:
            Amount in target currency
        """
        currency_upper = target_currency.upper()
        
        if currency_upper == "USD":
            return amount_usd.quantize(Decimal(f"0.{'0' * round_places}"), rounding=ROUND_HALF_UP)
        
        rate = self._rates.get(currency_upper)
        if rate is None:
            raise ValueError(f"Unsupported currency: {target_currency}")
        
        # Convert: amount = amount_usd / rate
        amount = amount_usd / rate
        
        return amount.quantize(
            Decimal(f"0.{'0' * round_places}"),
            rounding=ROUND_HALF_UP
        )
    
    def list_supported_currencies(self) -> list:
        """List all supported currency codes."""
        return list(self._rates.keys())
    
    def is_supported(self, currency: str) -> bool:
        """Check if a currency is supported."""
        return currency.upper() in self._rates


# Global converter instance
_converter: Optional[CurrencyConverter] = None


def get_currency_converter() -> CurrencyConverter:
    """Get the global currency converter instance."""
    global _converter
    if _converter is None:
        _converter = CurrencyConverter()
    return _converter


def convert_to_usd(amount: Decimal, currency: str) -> Decimal:
    """Convenience function to convert to USD.
    
    Args:
        amount: Amount in original currency
        currency: Original currency code
        
    Returns:
        Amount in USD
    """
    return get_currency_converter().convert_to_usd(amount, currency)
