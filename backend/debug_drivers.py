import sys
sys.path.append('D:/RP')
from backend.services.rev_data_service import get_revenue_data_service
import pandas as pd

svc = get_revenue_data_service()
# Ensure caches are built
svc._build_caches()
df = svc._rev_monthly_raw.copy()

print(f"Columns in raw df: {list(df.columns)}")

# Filter for 2026 Baseline (case insensitive)
mask = (df['year'] == 2026) & (df['scenario'].str.lower() == 'baseline')
df_year = df[mask]

print(f"Rows found for 2026 Baseline: {len(df_year)}")
summed = df_year.sum(numeric_only=True)

cols = ["forecast_usd_mn", "rev_usd_hotels_mn", "rev_usd_travel_agencies_mn", "rev_usd_shops_mn", "rev_usd_banks_mn", "rev_usd_gem_corp_mn"]
for c in cols:
    print(f"Sum of {c}: {summed.get(c)}")

total = summed.get("forecast_usd_mn", 0.0)
for c in cols[1:]:
    val = summed.get(c, 0.0)
    share = (val / total * 100) if total > 0 else 0
    print(f"Share of {c}: {share}%")
