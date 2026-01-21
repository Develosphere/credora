"""Automated test of competitor analysis API."""
import httpx
import asyncio

async def test_competitor_analysis():
    print("🎯 Testing Competitor Analysis API")
    print("=" * 70)
    
    # API endpoint
    url = "http://localhost:8000/competitor/analyze"
    
    # Request payload with visible_browser=True
    payload = {
        "business_type": "perfume",
        "city": "Karachi",
        "max_competitors": 3,
        "generate_report": True,
        "visible_browser": True
    }
    
    print(f"📤 Sending request to: {url}")
    print(f"📋 Payload: {payload}")
    print("=" * 70)
    print()
    print("⏳ Starting analysis...")
    print()
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(url, json=payload)
            
            print()
            print("=" * 70)
            print(f"✅ Response Status: {response.status_code}")
            print(f"📄 Response:")
            print(response.json())
            print("=" * 70)
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_competitor_analysis())
