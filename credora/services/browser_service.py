import asyncio
from typing import Optional, Dict, List
from playwright.async_api import async_playwright, Browser, Page
from bs4 import BeautifulSoup
import logging
import urllib.parse

class BrowserService:
    """Service for handling browser interactions using Playwright."""
    
    def __init__(self):
        self._browser: Optional[Browser] = None
        self._playwright = None
        self.logger = logging.getLogger(__name__)

    async def _ensure_browser(self):
        """Ensure a browser instance is running."""
        if not self._playwright:
            self._playwright = await async_playwright().start()
        
        if not self._browser:
            self._browser = await self._playwright.chromium.launch(headless=False, slow_mo=500)

    async def _new_context(self):
        """Create a new browser context with a real user agent."""
        await self._ensure_browser()
        return await self._browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )

    async def fetch_page_content(self, url: str) -> Dict[str, str]:
        """
        Navigate to a URL and fetch its content.
        
        Args:
            url: The URL to visit
            
        Returns:
            Dictionary containing 'html', 'text', and 'title'
        """
        try:
            # use _new_context to get a page with user agent
            context = await self._new_context()
            page = await context.new_page()
            
            # Set shorter timeout for efficiency
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            
            # Get content
            content = await page.content()
            title = await page.title()
            
            # Use BeautifulSoup to extract clean text
            soup = BeautifulSoup(content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
                
            text = soup.get_text(separator=' ', strip=True)
            
            await page.close()
            
            return {
                "html": content,
                "text": text,
                "title": title,
                "url": url
            }
            
        except Exception as e:
            self.logger.error(f"Error fetching {url}: {str(e)}")
            return {
                "html": "",
                "text": f"Error accessing page: {str(e)}",
                "title": "Error",
                "url": url
            }
            
    async def search_google(self, query: str) -> List[Dict[str, str]]:
        """
        Perform a Google search using the browser and return results.
        
        Args:
            query: Search query
            
        Returns:
            List of dictionaries with 'title', 'url', 'description'
        """
        try:
            # use _new_context to get a page with user agent
            context = await self._new_context()
            page = await context.new_page()
            
            # URL encode query
            encoded_query = urllib.parse.quote(query)
            search_url = f"https://www.google.com/search?q={encoded_query}&hl=en"
            
            await page.goto(search_url, timeout=30000, wait_until="domcontentloaded")
            
            # Wait for results to load
            try:
                await page.wait_for_selector('div.g', timeout=5000)
            except:
                pass # Continue even if selector timeout (might have different layout)

            # Get content
            content = await page.content()
            await page.close()
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            results = []
            
            # Find organic search results
            for g in soup.select('div.g')[:5]:
                anchor = g.select_one('a')
                if anchor and anchor.get('href', '').startswith('http'):
                    url = anchor['href']
                    title_elem = g.select_one('h3')
                    title = title_elem.get_text() if title_elem else "No Title"
                    
                    desc_elem = g.select_one('div[style*="-webkit-line-clamp"]') or g.select_one('div.VwiC3b')
                    description = desc_elem.get_text() if desc_elem else "No description"
                    
                    results.append({
                        "title": title,
                        "url": url,
                        "description": description
                    })
            
            return results

        except Exception as e:
            self.logger.error(f"Error searching google for {query}: {str(e)}")
            return []

    async def close(self):
        """Clean up resources."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

# Global instance for ease of use
browser_service = BrowserService()
