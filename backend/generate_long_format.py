"""
generate_long_format.py
~~~~~~~~~~~~~~~~~~~~~~~
One-time script to generate layer1_long_format.csv from the wide BCR CSV.
Run from the backend directory: python generate_long_format.py
"""
import pandas as pd
import numpy as np
from pathlib import Path

WIDE_CSV = Path(__file__).parent / "forecasts" / "data" / "layer1_bcr_wide_flourish.csv"
LONG_CSV = Path(__file__).parent / "forecasts" / "data" / "layer1_long_format.csv"

COUNTRY_METADATA = {
    "India":       {"iso3": "IND", "segment": "Mature"},
    "Russia":      {"iso3": "RUS", "segment": "Mature"},
    "UK":          {"iso3": "GBR", "segment": "Mature"},
    "Germany":     {"iso3": "DEU", "segment": "Mature"},
    "China":       {"iso3": "CHN", "segment": "Emerging"},
    "France":      {"iso3": "FRA", "segment": "Mature"},
    "Australia":   {"iso3": "AUS", "segment": "Mature"},
    "USA":         {"iso3": "USA", "segment": "Mature"},
    "Netherlands": {"iso3": "NLD", "segment": "Mature"},
    "Maldives":    {"iso3": "MDV", "segment": "Declining"},
    "Bangladesh":  {"iso3": "BGD", "segment": "Emerging"},
    "Poland":      {"iso3": "POL", "segment": "Emerging"},
    "Japan":       {"iso3": "JPN", "segment": "Declining"},
    "Canada":      {"iso3": "CAN", "segment": "Mature"},
    "Ukraine":     {"iso3": "UKR", "segment": "Declining"},
}

df_wide = pd.read_csv(WIDE_CSV)
year_cols = [c for c in df_wide.columns if c.strip().isdigit()]

rows = []
for _, row in df_wide.iterrows():
    country = str(row["Country"]).strip()
    meta = COUNTRY_METADATA.get(country, {"iso3": "UNK", "segment": "Other"})
    prev_arrivals = None
    for yr in sorted(year_cols, key=int):
        val = row[yr]
        if pd.isna(val) or val == "":
            prev_arrivals = None
            continue
        arrivals = int(float(val))
        yoy = None
        if prev_arrivals is not None and prev_arrivals > 0:
            yoy = round(((arrivals - prev_arrivals) / prev_arrivals) * 100, 1)
        rows.append({
            "Year": int(yr),
            "Country": country,
            "Arrivals": arrivals,
            "ISO3": meta["iso3"],
            "YoY_pct": yoy,
            "Segment": meta["segment"],
        })
        prev_arrivals = arrivals

df_long = pd.DataFrame(rows)

# Add Rank column per year
df_long["Rank"] = df_long.groupby("Year")["Arrivals"].rank(ascending=False, method="min").astype(int)

# Reorder columns
df_long = df_long[["Year", "Country", "Arrivals", "ISO3", "YoY_pct", "Rank", "Segment"]]
df_long = df_long.sort_values(["Year", "Rank"])

df_long.to_csv(LONG_CSV, index=False)
print(f"Written {len(df_long)} rows to {LONG_CSV}")
print(df_long.head(10).to_string())
