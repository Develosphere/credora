"""Simple test to verify competitor analysis endpoint."""
import requests
import json

print("🎯 Testing Competitor Analysis API")
print("=" * 70)

url = "http://localhost:8000/competitor/analyze"

payload = {
    "business_type": "perfume and fragrances",
    "city": "Karachi",
    "max_competitors": 2,
    "generate_report": True,
    "visible_browser": True
}

print(f"📤 Sending request to: {url}")
print(f"📋 Payload: {json.dumps(payload, indent=2)}")
print("=" * 70)
print()
print("⏳ Starting analysis (this may take 1-2 minutes)...")
print("🎯 Browser should launch in VISIBLE mode!")
print()

try:
    response = requests.post(url, json=payload, timeout=300)
    
    print()
    print("=" * 70)
    print(f"✅ Response Status: {response.status_code}")
    print(f"📄 Response:")
    print(json.dumps(response.json(), indent=2))
    print("=" * 70)
    
except requests.exceptions.Timeout:
    print("❌ Request timed out after 5 minutes")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
