"""Direct JSON reading tools for mock data.

Temporary replacement for RAG system - reads JSON files directly.
"""

import json
from pathlib import Path
from typing import Optional
from agents import function_tool


MOCK_DATA_PATH = Path("mock_data")


@function_tool
def read_mock_products(limit: int = 10) -> str:
    """Read products from mock Shopify data.
    
    Args:
        limit: Maximum number of products to return
        
    Returns:
        Formatted string with product information
    """
    try:
        products_file = MOCK_DATA_PATH / "shopify" / "products.json"
        
        if not products_file.exists():
            return "❌ No product data found. Mock data file is missing."
        
        with open(products_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        products = data.get('products', [])[:limit]
        
        if not products:
            return "📦 No products found in the catalog."
        
        # Format response in a friendly, human tone
        response = f"✅ Yes! I found {len(products)} products from your records:\n\n"
        
        for i, product in enumerate(products, 1):
            response += f"**{i}. {product.get('title', 'Unknown Product')}**\n"
            response += f"   - SKU: {product.get('sku', 'N/A')}\n"
            response += f"   - Price: ${product.get('price', 0):.2f}\n"
            response += f"   - Inventory: {product.get('total_inventory', 0)} units\n"
            response += f"   - Status: {product.get('status', 'unknown').title()}\n"
            
            if product.get('tags'):
                response += f"   - Tags: {', '.join(product['tags'])}\n"
            
            response += "\n"
        
        return response
        
    except Exception as e:
        return f"❌ Error reading product data: {str(e)}"


@function_tool
def read_mock_orders(limit: int = 10) -> str:
    """Read orders from mock Shopify data.
    
    Args:
        limit: Maximum number of orders to return
        
    Returns:
        Formatted string with order information
    """
    try:
        orders_file = MOCK_DATA_PATH / "shopify" / "orders.json"
        
        if not orders_file.exists():
            return "❌ No order data found. Mock data file is missing."
        
        with open(orders_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        orders = data.get('orders', [])[:limit]
        
        if not orders:
            return "📋 No orders found in the records."
        
        # Format response in a friendly, human tone
        response = f"✅ Great! I found {len(orders)} recent orders from your store:\n\n"
        
        total_revenue = sum(order.get('total_price', 0) for order in orders)
        
        for i, order in enumerate(orders, 1):
            response += f"**Order {order.get('order_number', f'#{i}')}**\n"
            response += f"   - Customer: {order.get('customer_name', 'Unknown')}\n"
            response += f"   - Total: ${order.get('total_price', 0):.2f}\n"
            response += f"   - Status: {order.get('financial_status', 'unknown').title()}\n"
            response += f"   - Date: {order.get('created_at', 'N/A')[:10]}\n"
            
            if order.get('line_items'):
                response += f"   - Items: {len(order['line_items'])} product(s)\n"
            
            response += "\n"
        
        response += f"💰 **Total Revenue from these orders: ${total_revenue:.2f}**\n"
        
        return response
        
    except Exception as e:
        return f"❌ Error reading order data: {str(e)}"


@function_tool
def read_mock_campaigns(platform: Optional[str] = None, limit: int = 10) -> str:
    """Read advertising campaigns from mock data.
    
    Args:
        platform: Filter by platform ('google' or 'meta'), None for all
        limit: Maximum number of campaigns to return
        
    Returns:
        Formatted string with campaign information
    """
    try:
        campaigns = []
        
        # Read Google Ads campaigns
        if platform is None or platform.lower() == 'google':
            google_file = MOCK_DATA_PATH / "google" / "campaigns.json"
            if google_file.exists():
                with open(google_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for campaign in data.get('campaigns', []):
                        campaign['platform'] = 'Google Ads'
                        campaigns.append(campaign)
        
        # Read Meta Ads campaigns
        if platform is None or platform.lower() == 'meta':
            meta_file = MOCK_DATA_PATH / "meta" / "campaigns.json"
            if meta_file.exists():
                with open(meta_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for campaign in data.get('campaigns', []):
                        campaign['platform'] = 'Meta Ads'
                        campaigns.append(campaign)
        
        if not campaigns:
            return f"❌ No campaign data found{f' for {platform}' if platform else ''}."
        
        campaigns = campaigns[:limit]
        
        # Format response in a friendly, human tone
        platform_text = f"{platform.title()} " if platform else ""
        response = f"✅ Awesome! I found {len(campaigns)} {platform_text}campaigns from your advertising accounts:\n\n"
        
        for i, campaign in enumerate(campaigns, 1):
            response += f"**{i}. {campaign.get('name', 'Unknown Campaign')}** ({campaign.get('platform', 'Unknown')})\n"
            response += f"   - Status: {campaign.get('status', 'unknown').title()}\n"
            response += f"   - Spend: ${campaign.get('cost', campaign.get('spend', 0)):.2f}\n"
            
            if 'impressions' in campaign:
                response += f"   - Impressions: {campaign['impressions']:,}\n"
            
            if 'clicks' in campaign:
                response += f"   - Clicks: {campaign['clicks']:,}\n"
            
            if 'roas' in campaign:
                response += f"   - ROAS: {campaign['roas']:.2f}x\n"
            
            if 'conversions' in campaign:
                response += f"   - Conversions: {campaign['conversions']}\n"
            
            response += "\n"
        
        return response
        
    except Exception as e:
        return f"❌ Error reading campaign data: {str(e)}"


@function_tool
def search_products_by_keyword(keyword: str, limit: int = 5) -> str:
    """Search products by keyword in title, SKU, or tags.
    
    Args:
        keyword: Search keyword
        limit: Maximum number of results
        
    Returns:
        Formatted string with matching products
    """
    try:
        products_file = MOCK_DATA_PATH / "shopify" / "products.json"
        
        if not products_file.exists():
            return "❌ No product data found."
        
        with open(products_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        products = data.get('products', [])
        keyword_lower = keyword.lower()
        
        # Search in title, SKU, and tags
        matching = []
        for product in products:
            title = product.get('title', '').lower()
            sku = product.get('sku', '').lower()
            tags = [tag.lower() for tag in product.get('tags', [])]
            
            if (keyword_lower in title or 
                keyword_lower in sku or 
                any(keyword_lower in tag for tag in tags)):
                matching.append(product)
        
        matching = matching[:limit]
        
        if not matching:
            return f"🔍 Sorry, I couldn't find any products matching '{keyword}' in your catalog."
        
        response = f"✅ Perfect! I found {len(matching)} product(s) matching '{keyword}':\n\n"
        
        for i, product in enumerate(matching, 1):
            response += f"**{i}. {product.get('title', 'Unknown')}**\n"
            response += f"   - SKU: {product.get('sku', 'N/A')}\n"
            response += f"   - Price: ${product.get('price', 0):.2f}\n"
            response += f"   - In Stock: {product.get('total_inventory', 0)} units\n"
            response += "\n"
        
        return response
        
    except Exception as e:
        return f"❌ Error searching products: {str(e)}"


@function_tool
def get_business_summary() -> str:
    """Get a comprehensive business summary from all mock data.
    
    Returns:
        Formatted string with business overview
    """
    try:
        summary = "📊 **Business Overview from Your Records:**\n\n"
        
        # Products summary
        products_file = MOCK_DATA_PATH / "shopify" / "products.json"
        if products_file.exists():
            with open(products_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                products = data.get('products', [])
                total_inventory = sum(p.get('total_inventory', 0) for p in products)
                avg_price = sum(p.get('price', 0) for p in products) / len(products) if products else 0
                
                summary += f"**📦 Products:**\n"
                summary += f"   - Total Products: {len(products)}\n"
                summary += f"   - Total Inventory: {total_inventory} units\n"
                summary += f"   - Average Price: ${avg_price:.2f}\n\n"
        
        # Orders summary
        orders_file = MOCK_DATA_PATH / "shopify" / "orders.json"
        if orders_file.exists():
            with open(orders_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                orders = data.get('orders', [])
                total_revenue = sum(o.get('total_price', 0) for o in orders)
                avg_order = total_revenue / len(orders) if orders else 0
                
                summary += f"**💰 Orders:**\n"
                summary += f"   - Total Orders: {len(orders)}\n"
                summary += f"   - Total Revenue: ${total_revenue:.2f}\n"
                summary += f"   - Average Order Value: ${avg_order:.2f}\n\n"
        
        # Campaigns summary
        total_campaigns = 0
        total_spend = 0
        
        google_file = MOCK_DATA_PATH / "google" / "campaigns.json"
        if google_file.exists():
            with open(google_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                campaigns = data.get('campaigns', [])
                total_campaigns += len(campaigns)
                total_spend += sum(c.get('cost', 0) for c in campaigns)
        
        meta_file = MOCK_DATA_PATH / "meta" / "campaigns.json"
        if meta_file.exists():
            with open(meta_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                campaigns = data.get('campaigns', [])
                total_campaigns += len(campaigns)
                total_spend += sum(c.get('spend', 0) for c in campaigns)
        
        if total_campaigns > 0:
            summary += f"**📢 Advertising:**\n"
            summary += f"   - Active Campaigns: {total_campaigns}\n"
            summary += f"   - Total Ad Spend: ${total_spend:.2f}\n\n"
        
        summary += "✨ This is a snapshot of your business data. Ask me anything specific!"
        
        return summary
        
    except Exception as e:
        return f"❌ Error generating business summary: {str(e)}"


__all__ = [
    'read_mock_products',
    'read_mock_orders',
    'read_mock_campaigns',
    'search_products_by_keyword',
    'get_business_summary',
]
