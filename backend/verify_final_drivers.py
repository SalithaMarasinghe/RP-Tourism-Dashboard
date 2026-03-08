import urllib.request
import json

url = "http://localhost:8000/rev/drivers?year=2026"
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        print(f"Total Revenue: {data['total_revenue_usd_mn']}")
        for d in data['drivers']:
            print(f"  {d['name']}: {d['value_usd_mn']} ({d['share_pct']}%)")
except Exception as e:
    print(f"Error: {e}")
