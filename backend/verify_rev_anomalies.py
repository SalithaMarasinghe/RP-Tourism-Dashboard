import urllib.request
import json

def test_endpoint(url):
    print(f"Testing: {url}")
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            # Print counts for brevity
            print(f"Events found: {len(data.get('events', []))}")
            print(f"Anomalies found: {len(data.get('anomalies', []))}")
            if data.get('events'):
                print(f"Sample Event: {data['events'][0]}")
            if data.get('anomalies'):
                print(f"Sample Anomaly: {data['anomalies'][0]}")
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"Error: {e.read().decode()}")
        else:
            print(f"Error: {e}")
    print("-" * 40)

base_url = "http://localhost:8000/rev/anomalies"

# 1. Default (revenue_usd_mn)
test_endpoint(base_url)

# 2. Filtered by arrivals metric
test_endpoint(f"{base_url}?metric=arrivals")

# 3. Filtered by year range (COVID era)
test_endpoint(f"{base_url}?start_year=2020&end_year=2021")
