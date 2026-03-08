import numpy as np
import pandas as pd
from typing import Optional


def build_monthly_revenue_forecast(
    forecast_revenue_df: pd.DataFrame,
    forecast_fx_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Normalizes ML tourism revenue forecast data and merges it with FX forecasts 
    to produce a canonical monthly revenue schema.

    Inputs:
        forecast_revenue_df: Pandas DataFrame from revenue_monthly_ml.csv
        forecast_fx_df: Pandas DataFrame from m1_usdlkr_forecast.csv

    Requirements:
        - Renames forecast columns to canonical schema
        - Merges FX forecast (including upper/lower bounds) by date (ds)
        - Computes rpt_usd and rptd_usd if applicable
        - Standardizes scenario names
        - Ensures ds is a proper datetime
        - Flags as is_forecast=True
        - Returns only canonical fields matching MonthlyRevenueRecord

    Args:
        forecast_revenue_df (pd.DataFrame): The monthly ML revenue predictions.
        forecast_fx_df (pd.DataFrame): The monthly USD/LKR exchange rate predictions.

    Returns:
        pd.DataFrame: A DataFrame perfectly matching the canonical MonthlyRevenueRecord schema.
    """
    df_rev = forecast_revenue_df.copy()
    df_fx = forecast_fx_df.copy()

    # 1. Validate required columns on the revenue side
    rev_required = ['period', 'year', 'month', 'scenario']
    for col in rev_required:
        if col not in df_rev.columns:
            raise ValueError(f"forecast_revenue_df is missing required column: '{col}'")

    # 2. Validate required columns on the FX side
    fx_required = ['date', 'usd_lkr_pred']
    for col in fx_required:
        if col not in df_fx.columns:
            raise ValueError(f"forecast_fx_df is missing required column: '{col}'")

    # Ensure date column is datetime in both to allow safe merging
    # Rename 'period' to 'ds' in revenue forecast first
    df_rev.rename(columns={'period': 'ds'}, inplace=True)
    df_fx.rename(columns={'date': 'ds', 'usd_lkr_pred': 'usd_lkr'}, inplace=True)
    df_rev['ds'] = pd.to_datetime(df_rev['ds'])
    df_fx['ds'] = pd.to_datetime(df_fx['ds'])

    # 3. Rename columns if they use typical forecasting aliases
    # For instance: target_usd -> revenue_usd_mn, predicted_arrivals -> arrivals
    rename_mapping = {
        'forecast_usd_mn': 'revenue_usd_mn',
        'yhat': 'revenue_usd_mn',  # Common Prophet output
        'forecast_lkr_mn': 'revenue_lkr_mn',
        'forecast_arrivals': 'arrivals',
        'predicted_arrivals': 'arrivals',
        'tourist_nights': 'tourist_nights_mn',
        'predicted_nights': 'tourist_nights_mn',
    }
    df_rev.rename(columns=rename_mapping, inplace=True)
    
    # Optional renaming for fx dataframe bounds
    fx_rename_mapping = {
        'yhat_lower': 'usd_lkr_lower',
        'lower_bound': 'usd_lkr_lower',
        'yhat_upper': 'usd_lkr_upper',
        'upper_bound': 'usd_lkr_upper'
    }
    df_fx.rename(columns=fx_rename_mapping, inplace=True)

    # Supply default 0 values if critical metrics are entirely missing from the forecast
    if 'revenue_usd_mn' not in df_rev.columns:
        df_rev['revenue_usd_mn'] = 0.0
    if 'revenue_lkr_mn' not in df_rev.columns:
        df_rev['revenue_lkr_mn'] = np.nan
    if 'arrivals' not in df_rev.columns:
        df_rev['arrivals'] = 0
    if 'tourist_nights_mn' not in df_rev.columns:
        df_rev['tourist_nights_mn'] = 0.0
    if 'los_days' not in df_rev.columns:
        df_rev['los_days'] = 0.0

    # 4. Standardize scenario names
    # Ensure they map correctly to "baseline", "optimistic", "pessimistic"
    scenario_mapping = {
        'base': 'baseline',
        'high': 'optimistic',
        'low': 'pessimistic',
        'opt': 'optimistic',
        'pess': 'pessimistic'
    }
    df_rev['scenario'] = df_rev['scenario'].astype(str).str.lower().replace(scenario_mapping)

    # 5. Merge the FX forecast onto the Revenue forecast by Date
    # We use a left merge because the revenue dataframe dictates the needed timeline
    merge_fx_cols = ['ds', 'usd_lkr']
    if 'usd_lkr_lower' in df_fx.columns: merge_fx_cols.append('usd_lkr_lower')
    if 'usd_lkr_upper' in df_fx.columns: merge_fx_cols.append('usd_lkr_upper')
    
    df_merged = pd.merge(df_rev, df_fx[merge_fx_cols], on='ds', how='left')

    # If LKR revenue wasn't forecasted, we can compute it using the FX rate forecast
    df_merged['revenue_lkr_mn'] = np.where(
        df_merged['revenue_lkr_mn'].isna() & df_merged['usd_lkr'].notna(),
        df_merged['revenue_usd_mn'] * df_merged['usd_lkr'],
        df_merged['revenue_lkr_mn']
    )

    # 6. Compute derived per-capita metrics (rpt_usd, rptd_usd)
    # Revenue Per Tourist
    df_merged['rpt_usd'] = np.where(
        df_merged['arrivals'] > 0,
        (df_merged['revenue_usd_mn'] * 1_000_000) / df_merged['arrivals'],
        0.0
    )
    
    # Back-calculate length of stay if we have nights but not LOS
    df_merged['los_days'] = np.where(
        (df_merged['los_days'] == 0) & (df_merged['arrivals'] > 0) & (df_merged['tourist_nights_mn'] > 0),
        (df_merged['tourist_nights_mn'] * 1_000_000) / df_merged['arrivals'],
        df_merged['los_days']
    )

    # Revenue Per Tourist Per Day
    df_merged['rptd_usd'] = np.where(
        df_merged['los_days'] > 0,
        df_merged['rpt_usd'] / df_merged['los_days'],
        0.0
    )

    # 7. Apply static canonical flags
    df_merged['is_forecast'] = True
    df_merged['event_flag'] = None
    df_merged['anomaly_flag'] = False
    
    # Ensure FX bound columns exist even if FX model didn't provide them
    if 'usd_lkr_lower' not in df_merged.columns:
        df_merged['usd_lkr_lower'] = None
    if 'usd_lkr_upper' not in df_merged.columns:
        df_merged['usd_lkr_upper'] = None

    # 8. Align the exact column schema output
    canonical_columns = [
        'ds', 'year', 'month', 'scenario', 'is_forecast', 'arrivals',
        'revenue_usd_mn', 'revenue_lkr_mn', 'tourist_nights_mn', 'los_days',
        'rpt_usd', 'rptd_usd', 'usd_lkr', 'usd_lkr_lower', 'usd_lkr_upper',
        'event_flag', 'anomaly_flag'
    ]

    # Verify all columns exist before filtering, add missing as None/NaN if somehow skipped
    for col in canonical_columns:
        if col not in df_merged.columns:
            df_merged[col] = None

    out_df = df_merged[canonical_columns].copy()

    # 9. Format datatypes and precision safely
    out_df['year'] = out_df['year'].fillna(0).astype(int)
    out_df['month'] = out_df['month'].fillna(1).astype(int)
    out_df['arrivals'] = out_df['arrivals'].fillna(0).astype(int)
    out_df['is_forecast'] = out_df['is_forecast'].astype(bool)

    float_cols_to_round = ['revenue_usd_mn', 'rpt_usd', 'rptd_usd']
    for col in float_cols_to_round:
        out_df[col] = out_df[col].astype(float).round(2)

    out_df['tourist_nights_mn'] = out_df['tourist_nights_mn'].astype(float).round(4)
    out_df['los_days'] = out_df['los_days'].astype(float).round(2)

    if out_df['revenue_lkr_mn'].notna().any():
        out_df['revenue_lkr_mn'] = out_df['revenue_lkr_mn'].astype(float).round(2)
    if out_df['usd_lkr'].notna().any():
        out_df['usd_lkr'] = out_df['usd_lkr'].astype(float).round(2)
    if out_df['usd_lkr_lower'].notna().any():
        out_df['usd_lkr_lower'] = out_df['usd_lkr_lower'].astype(float).round(2)
    if out_df['usd_lkr_upper'].notna().any():
        out_df['usd_lkr_upper'] = out_df['usd_lkr_upper'].astype(float).round(2)

    return out_df
