import numpy as np
import pandas as pd
from typing import Optional


def reconstruct_historical_monthly_revenue(
    monthly_arrivals_df: pd.DataFrame,
    annual_revenue_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Reconstructs historical monthly tourism revenue KPIs by apportioning annual totals 
    down to the monthly level based on the monthly share of annual arrivals.
    
    Args:
        monthly_arrivals_df (pd.DataFrame): Long-format dataframe of monthly arrivals.
            Required columns: ['ds', 'year', 'month', 'arrivals']
        annual_revenue_df (pd.DataFrame): Annual dataframe containing yearly totals.
            Required columns: ['year', 'revenue_lkr_mn' (optional), 'revenue_usd_mn', 'total_arrivals']
            along with either 'avg_los' or 'tourist_nights_000' to compute Length of Stay.
            
    Returns:
        pd.DataFrame: A DataFrame perfectly matching the canonical MonthlyRevenueRecord schema.
    """
    df_monthly = monthly_arrivals_df.copy()
    df_annual = annual_revenue_df.copy()

    # 1. Validate required columns for monthly dataframe
    required_monthly_cols = ['ds', 'year', 'month', 'arrivals']
    for col in required_monthly_cols:
        if col not in df_monthly.columns:
            raise ValueError(f"monthly_arrivals_df is missing required column: '{col}'")
            
    # 2. Validate essential columns for annual dataframe
    required_annual_cols = ['year', 'revenue_usd_mn', 'total_arrivals']
    for col in required_annual_cols:
        if col not in df_annual.columns:
            raise ValueError(f"annual_revenue_df is missing required column: '{col}'")
            
    # 3. Derive Average Length of Stay (avg_los) on the annual dataframe if not present
    if 'avg_los' not in df_annual.columns:
        if 'tourist_nights_000' in df_annual.columns:
            df_annual['avg_los'] = (df_annual['tourist_nights_000'] * 1000) / df_annual['total_arrivals']
            df_annual['avg_los'] = df_annual['avg_los'].replace([np.inf, -np.inf], 0).fillna(0)
        else:
            raise ValueError("annual_revenue_df must contain either 'avg_los' or 'tourist_nights_000' to compute Length of Stay.")

    # Select only the relevant annual columns for the merge
    merge_cols = ['year', 'total_arrivals', 'revenue_usd_mn', 'avg_los']
    if 'revenue_lkr_mn' in df_annual.columns:
        merge_cols.append('revenue_lkr_mn')
        
    # 4. Merge monthly arrivals with annual totals by year
    df_merged = pd.merge(
        df_monthly,
        df_annual[merge_cols],
        on='year',
        how='left'
    )
    
    # 5. Compute Monthly Revenue Allocation
    # monthly_revenue_usd = annual_revenue_usd * (monthly_arrivals / annual_arrivals)
    df_merged['arrival_share'] = df_merged['arrivals'] / df_merged['total_arrivals']
    df_merged['revenue_usd_mn_temp'] = df_merged['revenue_usd_mn'] * df_merged['arrival_share']
    
    if 'revenue_lkr_mn' in df_merged.columns:
        df_merged['revenue_lkr_mn_temp'] = df_merged['revenue_lkr_mn'] * df_merged['arrival_share']
        
        # Compute implied USD/LKR exchange rate
        # usd_lkr = revenue_lkr_mn / revenue_usd_mn
        df_merged['usd_lkr'] = np.where(
            df_merged['revenue_usd_mn_temp'] > 0,
            df_merged['revenue_lkr_mn_temp'] / df_merged['revenue_usd_mn_temp'],
            np.nan
        )
    else:
        df_merged['revenue_lkr_mn_temp'] = None
        df_merged['usd_lkr'] = None
        
    df_merged['revenue_usd_mn'] = df_merged['revenue_usd_mn_temp']
    df_merged['revenue_lkr_mn'] = df_merged['revenue_lkr_mn_temp']
        
    # 6. Compute Tourist Nights and per-capita metrics
    # tourist_nights_mn = (arrivals * annual LOS) / 1,000,000
    df_merged['los_days'] = df_merged['avg_los']
    df_merged['tourist_nights_mn'] = (df_merged['arrivals'] * df_merged['los_days']) / 1_000_000
    
    # rpt_usd (Revenue Per Tourist) = (revenue_usd_mn * 1,000,000) / arrivals
    df_merged['rpt_usd'] = np.where(
        df_merged['arrivals'] > 0,
        (df_merged['revenue_usd_mn'] * 1_000_000) / df_merged['arrivals'],
        0.0
    )
    
    # rptd_usd (Revenue Per Tourist Per Day) = rpt_usd / los_days
    df_merged['rptd_usd'] = np.where(
        df_merged['los_days'] > 0,
        df_merged['rpt_usd'] / df_merged['los_days'],
        0.0
    )
    
    # 7. Add Static Fields matching the schema
    df_merged['scenario'] = 'Historical'
    df_merged['is_forecast'] = False
    df_merged['usd_lkr_lower'] = None
    df_merged['usd_lkr_upper'] = None
    df_merged['event_flag'] = None
    df_merged['anomaly_flag'] = False
    
    # 8. Align the exact column schema output
    canonical_columns = [
        'ds', 'year', 'month', 'scenario', 'is_forecast', 'arrivals',
        'revenue_usd_mn', 'revenue_lkr_mn', 'tourist_nights_mn', 'los_days',
        'rpt_usd', 'rptd_usd', 'usd_lkr', 'usd_lkr_lower', 'usd_lkr_upper',
        'event_flag', 'anomaly_flag'
    ]
    
    # Output projection
    out_df = df_merged[canonical_columns].copy()
    
    # 9. Format datatypes and precision for clean JSON serialization later
    out_df['year'] = out_df['year'].fillna(0).astype(int)
    out_df['month'] = out_df['month'].fillna(1).astype(int)
    out_df['arrivals'] = out_df['arrivals'].fillna(0).astype(int)
    out_df['is_forecast'] = out_df['is_forecast'].astype(bool)
    
    # Round metrics to safe decimals (helps avoid floating point artifacts)
    float_cols_to_round = ['revenue_usd_mn', 'rpt_usd', 'rptd_usd']
    for col in float_cols_to_round:
        out_df[col] = out_df[col].astype(float).round(2)
        
    out_df['tourist_nights_mn'] = out_df['tourist_nights_mn'].astype(float).round(4)
    out_df['los_days'] = out_df['los_days'].astype(float).round(2)
    
    # Use float nullable behavior correctly
    if out_df['revenue_lkr_mn'].notna().any():
        out_df['revenue_lkr_mn'] = out_df['revenue_lkr_mn'].astype(float).round(2)
    if out_df['usd_lkr'].notna().any():
        out_df['usd_lkr'] = out_df['usd_lkr'].astype(float).round(2)
        
    return out_df
