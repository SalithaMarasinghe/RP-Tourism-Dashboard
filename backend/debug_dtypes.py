import sys
sys.path.append('D:/RP')
from backend.services.rev_data_service import get_revenue_data_service
import pandas as pd

svc = get_revenue_data_service()
svc._build_caches()
df = svc._rev_monthly_raw.copy()

mask = (df['year'] == 2026) & (df['scenario'].str.lower() == 'baseline')
df_year = df[mask]

print(f"Data types:\n{df_year.dtypes}")
summed = df_year.sum(numeric_only=True)
print(f"Summed values:\n{summed}")
