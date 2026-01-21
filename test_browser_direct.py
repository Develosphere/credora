"""Direct test of browser functionality."""
import asyncio
from playwright.async_api import async_playwright

async def test_browser():
    print("🎯 Testing Browser Launch")
    print("=" * 70)
    
    try:
        print("📦 Importing playwright...")
        async with async_playwright() as p:
            print("✅ Playwright imported successfully")
            
            print("🚀 Launching browser in VISIBLE mode...")
            browser = await p.chromium.launch(
                headless=False,
                slow_mo=1000
            )
            print("✅ Browser launched!")
            print("🌐 Browser window should be visible now!")
            
            print("📄 Creating a test page...")
            context = await browser.new_context()
            page = await context.new_page()
            
            print("🎯 Navigating to Google...")
            await page.goto("https://www.google.com")
            print("✅ Page loaded!")
            
            print("⏳ Waiting 5 seconds so you can see the browser...")
            await page.wait_for_timeout(5000)
            
            print("🧹 Closing browser...")
            await browser.close()
            print("✅ Test complete!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_browser())
