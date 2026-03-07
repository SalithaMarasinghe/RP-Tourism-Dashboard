import pandas as pd
df = pd.read_csv(r'D:\RP\backend\forecasts\data\revenue_monthly_ml.csv')
print(f"Header: {list(df.columns)}")
# Filter for 2026 Baseline
mask = (df['year'] == 2026) & (df['scenario'].str.lower() == 'baseline')
print(df[mask].head(2).to_string())
