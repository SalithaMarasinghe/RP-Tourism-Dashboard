import urllib.request
import json

def test_endpoint(url):
    print(f"Testing: {url}")
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            print(json.dumps(data, indent=2))
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"Error: {e.read().decode()}")
        else:
            print(f"Error: {e}")
    print("-" * 40)

base_url = "http://localhost:8000/rev/drivers"

# 1. Forecast Year (no scenario, should default to baseline)
test_endpoint(f"{base_url}?year=2026")

# 2. Forecast Year (explicit scenario)
test_endpoint(f"{base_url}?year=2026&scenario=optimistic")

# 3. Historical Year (should 404 as per requirements if data missing)
test_endpoint(f"{base_url}?year=2023")
