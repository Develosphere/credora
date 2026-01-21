"""
Competitor-Spy MCP Server (Enhanced)
=====================================
A production-ready MCP server for comprehensive competitor research.

This server provides AI Agents with tools to:
1. Launch a VISIBLE browser and search for competitors
2. Scrape multiple competitor websites one by one
3. Analyze competitor strategies (pricing, offers, tactics)
4. Generate a complete .txt report

Dependencies:
    uv add fastmcp playwright beautifulsoup4 duckduckgo-search
    playwright install chromium

Author: Credora Team
"""

from fastmcp import FastMCP
from ddgs import DDGS
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import logging
import os
from datetime import datetime
from typing import List, Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("competitor-spy")

# Initialize the FastMCP server
mcp = FastMCP("Competitor-Spy")

# Store for competitor data during analysis session
competitor_data = []


# =============================================================================
# Tool 1: Full Competitor Research (Visible Browser + Search + Analysis)
# =============================================================================

@mcp.tool()
def analyze_competitors(
    business_type: str,
    city: str = "Karachi",
    max_competitors: int = 5,
    output_file: str = "competitor_analysis_report.txt"
) -> str:
    """
    Complete competitor analysis workflow with VISIBLE browser.
    
    This tool will:
    1. Launch a VISIBLE browser (you can watch it work)
    2. Search Google for top competitors in your industry/city
    3. Visit each competitor website one by one
    4. Scrape and analyze their strategies
    5. Generate a comprehensive .txt report
    
    Args:
        business_type: Your business type (e.g., "perfume", "candles", "clothing")
        city: City to search in (default: "Karachi")
        max_competitors: Number of competitors to analyze (default: 5, max: 10)
        output_file: Name of the output report file (default: competitor_analysis_report.txt)
    
    Returns:
        Path to the generated report and summary of findings.
    
    Example:
        analyze_competitors("perfume", "Karachi", 5)
    """
    global competitor_data
    competitor_data = []
    
    try:
        max_competitors = min(max(1, max_competitors), 10)
        search_query = f"best {business_type} shops {city} Pakistan"
        
        logger.info(f"Starting competitor analysis for: {business_type} in {city}")
        print(f"\n{'='*70}")
        print(f"COMPETITOR ANALYSIS: {business_type.upper()} in {city.upper()}")
        print(f"{'='*70}\n")
        
        # Step 1: Launch VISIBLE browser and search
        print("[STEP 1] Launching browser and searching for competitors...")
        
        with sync_playwright() as p:
            # Launch VISIBLE browser (headless=False)
            browser = p.chromium.launch(
                headless=False,  # VISIBLE BROWSER
                slow_mo=500      # Slow down so user can see
            )
            
            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 900}
            )
            
            page = context.new_page()
            
            # Go to Google and search
            print(f"   Searching: '{search_query}'")
            page.goto(f"https://www.google.com/search?q={search_query.replace(' ', '+')}", timeout=30000)
            page.wait_for_timeout(2000)
            
            # Extract search results
            print("[STEP 2] Extracting competitor URLs from search results...")
            
            # Get all organic search result links
            search_results = page.query_selector_all("div.g a[href^='http']")
            
            competitor_urls = []
            seen_domains = set()
            
            for result in search_results:
                try:
                    href = result.get_attribute("href")
                    if href and "google" not in href and "youtube" not in href:
                        # Extract domain
                        from urllib.parse import urlparse
                        domain = urlparse(href).netloc
                        if domain and domain not in seen_domains:
                            seen_domains.add(domain)
                            competitor_urls.append(href)
                            print(f"   Found: {domain}")
                            if len(competitor_urls) >= max_competitors:
                                break
                except:
                    continue
            
            # Fallback to DuckDuckGo if Google didn't give enough results
            if len(competitor_urls) < max_competitors:
                print(f"   Supplementing with DuckDuckGo search...")
                try:
                    with DDGS() as ddgs:
                        ddg_results = list(ddgs.text(search_query, max_results=max_competitors))
                        for r in ddg_results:
                            url = r.get("href", r.get("link", ""))
                            if url:
                                from urllib.parse import urlparse
                                domain = urlparse(url).netloc
                                if domain and domain not in seen_domains:
                                    seen_domains.add(domain)
                                    competitor_urls.append(url)
                                    print(f"   Found (DDG): {domain}")
                                    if len(competitor_urls) >= max_competitors:
                                        break
                except Exception as e:
                    print(f"   DuckDuckGo search failed: {e}")
            
            print(f"\n[STEP 3] Analyzing {len(competitor_urls)} competitor websites one by one...")
            
            # Step 3: Visit and scrape each competitor website
            for i, url in enumerate(competitor_urls, 1):
                print(f"\n   [{i}/{len(competitor_urls)}] Visiting: {url[:60]}...")
                
                try:
                    page.goto(url, timeout=30000, wait_until="domcontentloaded")
                    page.wait_for_timeout(3000)  # Wait for JS to render
                    
                    # Get page info
                    page_title = page.title()
                    html_content = page.content()
                    current_url = page.url
                    
                    # Parse and extract text
                    soup = BeautifulSoup(html_content, "html.parser")
                    
                    # Remove non-content elements
                    for tag in soup.find_all(["script", "style", "nav", "footer", "header", "noscript", "iframe", "svg"]):
                        tag.decompose()
                    
                    text = soup.get_text(separator="\n", strip=True)
                    lines = [line.strip() for line in text.splitlines() if line.strip()]
                    clean_text = "\n".join(lines)[:15000]  # Limit to 15k chars
                    
                    # Extract key information
                    from urllib.parse import urlparse
                    domain = urlparse(current_url).netloc
                    
                    # Look for pricing, offers, etc.
                    text_lower = clean_text.lower()
                    
                    has_prices = any(x in text_lower for x in ["rs", "pkr", "price", "/-", "rupee"])
                    has_discounts = any(x in text_lower for x in ["sale", "discount", "off", "offer", "deal"])
                    has_shipping = any(x in text_lower for x in ["delivery", "shipping", "free delivery", "cod"])
                    has_reviews = any(x in text_lower for x in ["review", "rating", "star", "customer"])
                    
                    competitor_info = {
                        "rank": i,
                        "name": page_title,
                        "domain": domain,
                        "url": current_url,
                        "content_preview": clean_text[:3000],
                        "has_prices": has_prices,
                        "has_discounts": has_discounts,
                        "has_shipping": has_shipping,
                        "has_reviews": has_reviews,
                        "content_length": len(clean_text)
                    }
                    
                    competitor_data.append(competitor_info)
                    print(f"       Title: {page_title[:50]}...")
                    print(f"       Prices: {'Yes' if has_prices else 'No'} | Discounts: {'Yes' if has_discounts else 'No'} | Shipping: {'Yes' if has_shipping else 'No'}")
                    
                except Exception as e:
                    print(f"       Error: {str(e)[:50]}")
                    competitor_data.append({
                        "rank": i,
                        "domain": url,
                        "error": str(e)
                    })
            
            # Close browser
            print("\n[STEP 4] Closing browser...")
            browser.close()
        
        # Step 4: Generate report
        print(f"\n[STEP 5] Generating report: {output_file}")
        report = _generate_report(business_type, city, competitor_data)
        
        # Save report
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(report)
        
        print(f"\n{'='*70}")
        print(f"ANALYSIS COMPLETE!")
        print(f"Report saved to: {os.path.abspath(output_file)}")
        print(f"{'='*70}\n")
        
        return f"Analysis complete! Report saved to: {os.path.abspath(output_file)}\n\nFound {len(competitor_data)} competitors."
        
    except Exception as e:
        error_msg = f"Error during analysis: {str(e)}"
        logger.error(error_msg)
        return error_msg


def _generate_report(business_type: str, city: str, data: List[Dict]) -> str:
    """Generate a comprehensive competitor analysis report."""
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    report = []
    report.append("=" * 80)
    report.append("COMPETITOR ANALYSIS REPORT")
    report.append("=" * 80)
    report.append(f"\nBusiness Type: {business_type.upper()}")
    report.append(f"Location: {city}")
    report.append(f"Generated: {now}")
    report.append(f"Total Competitors Analyzed: {len(data)}")
    report.append("\n" + "=" * 80)
    
    # Summary Section
    report.append("\n## EXECUTIVE SUMMARY\n")
    
    successful = [d for d in data if "error" not in d]
    with_prices = [d for d in successful if d.get("has_prices")]
    with_discounts = [d for d in successful if d.get("has_discounts")]
    with_shipping = [d for d in successful if d.get("has_shipping")]
    with_reviews = [d for d in successful if d.get("has_reviews")]
    
    report.append(f"- Successfully analyzed: {len(successful)} websites")
    report.append(f"- Competitors showing prices: {len(with_prices)} ({len(with_prices)*100//max(len(successful),1)}%)")
    report.append(f"- Competitors with discounts/offers: {len(with_discounts)} ({len(with_discounts)*100//max(len(successful),1)}%)")
    report.append(f"- Competitors offering delivery: {len(with_shipping)} ({len(with_shipping)*100//max(len(successful),1)}%)")
    report.append(f"- Competitors showing reviews: {len(with_reviews)} ({len(with_reviews)*100//max(len(successful),1)}%)")
    
    report.append("\n" + "-" * 80)
    
    # Detailed Analysis
    report.append("\n## DETAILED COMPETITOR ANALYSIS\n")
    
    for comp in data:
        report.append("-" * 80)
        report.append(f"\n### COMPETITOR #{comp.get('rank', '?')}: {comp.get('domain', 'Unknown')}\n")
        
        if "error" in comp:
            report.append(f"   ERROR: Could not analyze - {comp['error']}")
            continue
        
        report.append(f"   Website: {comp.get('url', 'N/A')}")
        report.append(f"   Title: {comp.get('name', 'N/A')}")
        report.append(f"   Content Length: {comp.get('content_length', 0):,} characters")
        report.append("")
        report.append("   STRATEGY INDICATORS:")
        report.append(f"   - Shows Prices: {'YES' if comp.get('has_prices') else 'NO'}")
        report.append(f"   - Has Discounts/Offers: {'YES' if comp.get('has_discounts') else 'NO'}")
        report.append(f"   - Offers Delivery/Shipping: {'YES' if comp.get('has_shipping') else 'NO'}")
        report.append(f"   - Shows Customer Reviews: {'YES' if comp.get('has_reviews') else 'NO'}")
        report.append("")
        
        # Add content preview
        preview = comp.get('content_preview', '')[:2000]
        if preview:
            report.append("   CONTENT PREVIEW:")
            report.append("   " + "-" * 40)
            # Clean and format preview
            preview_lines = preview.split('\n')[:30]
            for line in preview_lines:
                if line.strip():
                    report.append(f"   {line[:100]}")
        
        report.append("")
    
    # Strategic Recommendations
    report.append("\n" + "=" * 80)
    report.append("\n## STRATEGIC RECOMMENDATIONS\n")
    
    report.append("Based on the competitor analysis, here are key recommendations:\n")
    
    if len(with_prices) > len(successful) // 2:
        report.append("1. PRICING TRANSPARENCY")
        report.append("   - Most competitors show prices openly")
        report.append("   - Consider displaying your prices to build trust")
        report.append("")
    
    if len(with_discounts) > 0:
        report.append("2. PROMOTIONAL STRATEGY")
        report.append(f"   - {len(with_discounts)} competitors use discounts/offers")
        report.append("   - Consider seasonal promotions, bundle deals, or first-time buyer discounts")
        report.append("")
    
    if len(with_shipping) > len(successful) // 2:
        report.append("3. DELIVERY OPTIONS")
        report.append("   - Delivery/shipping is a key differentiator")
        report.append("   - Offer free delivery above a threshold, or same-day delivery in your city")
        report.append("")
    
    if len(with_reviews) > 0:
        report.append("4. SOCIAL PROOF")
        report.append(f"   - {len(with_reviews)} competitors showcase customer reviews")
        report.append("   - Collect and display customer testimonials prominently")
        report.append("")
    
    report.append("\n" + "=" * 80)
    report.append("\n## END OF REPORT")
    report.append("=" * 80)
    report.append(f"\nGenerated by Competitor-Spy MCP Server")
    report.append(f"Report Date: {now}")
    
    return "\n".join(report)


# =============================================================================
# Tool 2: Quick Search (No browser visible)
# =============================================================================

@mcp.tool()
def search_competitors(query: str, max_results: int = 5) -> str:
    """
    Quick search for competitors using DuckDuckGo (no visible browser).
    
    This is a fast search that returns competitor URLs without opening a browser.
    Use analyze_competitors() for full analysis with visible browser.
    
    Args:
        query: The search query (e.g., "perfume shops Karachi Pakistan")
        max_results: Maximum number of results (default: 5)
    
    Returns:
        List of competitor URLs and snippets.
    """
    try:
        max_results = min(max(1, max_results), 10)
        logger.info(f"Quick search: '{query}'")
        
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        
        if not results:
            return "No results found."
        
        output = [f"SEARCH RESULTS FOR: \"{query}\"\n" + "=" * 60]
        
        for i, r in enumerate(results, 1):
            title = r.get("title", "No title")
            url = r.get("href", r.get("link", "No URL"))
            snippet = r.get("body", "")[:150]
            
            output.append(f"\n{i}. {title}")
            output.append(f"   URL: {url}")
            output.append(f"   {snippet}...")
            output.append("-" * 60)
        
        return "\n".join(output)
        
    except Exception as e:
        return f"Search Error: {str(e)}"


# =============================================================================
# Tool 3: Scrape Single Website
# =============================================================================

@mcp.tool()
def scrape_website(url: str, visible: bool = False) -> str:
    """
    Scrape and extract content from a single website.
    
    Args:
        url: The URL to scrape
        visible: If True, shows the browser (default: False for speed)
    
    Returns:
        Extracted text content from the page.
    """
    try:
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        
        logger.info(f"Scraping: {url}")
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=not visible, slow_mo=300 if visible else 0)
            page = browser.new_page()
            page.goto(url, timeout=30000, wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            
            html = page.content()
            title = page.title()
            browser.close()
        
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup.find_all(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        
        text = soup.get_text(separator="\n", strip=True)
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        clean = "\n".join(lines)[:8000]
        
        return f"WEBSITE: {url}\nTITLE: {title}\n{'='*60}\n\n{clean}"
        
    except Exception as e:
        return f"Scrape Error: {str(e)}"


# =============================================================================
# Server Entry Point
# =============================================================================

if __name__ == "__main__":
    logger.info("Starting Competitor-Spy MCP Server...")
    print("\n" + "=" * 60)
    print("COMPETITOR-SPY MCP SERVER")
    print("=" * 60)
    print("\nAvailable Tools:")
    print("  1. analyze_competitors(business_type, city, max_competitors, output_file)")
    print("     - Full analysis with VISIBLE browser + report generation")
    print("  2. search_competitors(query, max_results)")
    print("     - Quick search without browser")
    print("  3. scrape_website(url, visible)")
    print("     - Scrape a single website")
    print("\n" + "=" * 60 + "\n")
    mcp.run()
