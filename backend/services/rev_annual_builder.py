import numpy as np
import pandas as pd

def build_annual_revenue_dataset(
    historical_annual_df: pd.DataFrame,
    forecast_annual_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Combines historical annual tourism data with forecasted annual tourism revenue data,
    normalizing both into a single canonical Schema.

    Args:
        historical_annual_df (pd.DataFrame): The raw historical annual dataframe.
        forecast_annual_df (pd.DataFrame): The ML annual revenue forecast dataframe.

    Returns:
        pd.DataFrame: A canonical dataframe matching the AnnualRevenueRecord schema.
    """
    df_hist = historical_annual_df.copy()
    df_fcst = forecast_annual_df.copy()

    # --- Process Historical Data ---
    
    # Identify key columns in historical data
    # Normalizing column names to match internal processing standards
    rename_mapping_hist = {
        'totalarrivals': 'total_arrivals',
        'revenueusdmn': 'revenue_usd_mn',
        'revenuelkrmn': 'revenue_lkr_mn',
        'tourist_nights_000': 'tourist_nights_mn' # will adjust units below
    }
    df_hist.rename(columns=rename_mapping_hist, inplace=True, errors='ignore')

    df_hist['scenario'] = 'historical'
    df_hist['is_forecast'] = False
    
    if 'tourist_nights_mn' in df_hist.columns and 'avg_los' not in df_hist.columns:
        # Convert thousands to millions
        df_hist['tourist_nights_mn'] = df_hist['tourist_nights_mn'] / 1000.0
        # Compute LOS
        df_hist['avg_los'] = np.where(
            df_hist['total_arrivals'] > 0,
            (df_hist['tourist_nights_mn'] * 1_000_000) / df_hist['total_arrivals'],
            0.0
        )
    elif 'avg_los' in df_hist.columns and 'tourist_nights_mn' not in df_hist.columns:
        df_hist['tourist_nights_mn'] = (df_hist['total_arrivals'] * df_hist['avg_los']) / 1_000_000
    else:
        # Defaults if missing
        if 'tourist_nights_mn' not in df_hist.columns: df_hist['tourist_nights_mn'] = 0.0
        if 'avg_los' not in df_hist.columns: df_hist['avg_los'] = 0.0

    # Ensure LKR column exists
    if 'revenue_lkr_mn' not in df_hist.columns:
        df_hist['revenue_lkr_mn'] = np.nan

    # --- Process Forecast Data ---
    
    # Typically, forecast data might have different column names
    rename_mapping_fcst = {
        'forecast_usd_mn': 'revenue_usd_mn',
        'yhat': 'revenue_usd_mn',
        'forecast_lkr_mn': 'revenue_lkr_mn',
        'forecast_arrivals': 'total_arrivals',
        'predicted_arrivals': 'total_arrivals',
        'tourist_nights': 'tourist_nights_mn',
    }
    df_fcst.rename(columns=rename_mapping_fcst, inplace=True, errors='ignore')

    df_fcst['is_forecast'] = True
    
    # Standardize scenario names
    scenario_mapping = {
        'base': 'baseline',
        'high': 'optimistic',
        'low': 'pessimistic',
        'opt': 'optimistic',
        'pess': 'pessimistic'
    }
    if 'scenario' in df_fcst.columns:
        df_fcst['scenario'] = df_fcst['scenario'].astype(str).str.lower().replace(scenario_mapping)
    else:
        df_fcst['scenario'] = 'baseline'

    # Fill missing essential columns with 0/NaN
    for col in ['total_arrivals', 'revenue_usd_mn']:
        if col not in df_fcst.columns:
            df_fcst[col] = 0.0
            
    if 'tourist_nights_mn' not in df_fcst.columns: df_fcst['tourist_nights_mn'] = 0.0
    if 'avg_los' not in df_fcst.columns: df_fcst['avg_los'] = 0.0
    if 'revenue_lkr_mn' not in df_fcst.columns: df_fcst['revenue_lkr_mn'] = np.nan

    # --- Combine Datasets ---
    
    # Only keep the intersection of processed columns to safely concat
    common_cols = ['year', 'scenario', 'is_forecast', 'total_arrivals', 'revenue_usd_mn', 
                   'revenue_lkr_mn', 'tourist_nights_mn', 'avg_los']
    
    for col in common_cols:
        if col not in df_hist.columns: df_hist[col] = np.nan
        if col not in df_fcst.columns: df_fcst[col] = np.nan
        
    df_combined = pd.concat([df_hist[common_cols], df_fcst[common_cols]], ignore_index=True)

    # --- Compute Derived Annual Metrics ---
    
    # Compute Billions
    df_combined['revenue_usd_bn'] = df_combined['revenue_usd_mn'] / 1000.0
    df_combined['revenue_lkr_bn'] = df_combined['revenue_lkr_mn'] / 1000.0
    
    # Implied USD/LKR exchange rate
    df_combined['avg_usd_lkr'] = np.where(
        (df_combined['revenue_usd_mn'] > 0) & df_combined['revenue_lkr_mn'].notna(),
        df_combined['revenue_lkr_mn'] / df_combined['revenue_usd_mn'],
        np.nan
    )
    
    # Per-capita metrics
    df_combined['avg_rpt_usd'] = np.where(
        df_combined['total_arrivals'] > 0,
        (df_combined['revenue_usd_mn'] * 1_000_000) / df_combined['total_arrivals'],
        0.0
    )
    
    # Back-calculate LOS if missing but nights and arrivals are present
    df_combined['avg_los'] = np.where(
        (df_combined['avg_los'] == 0) & (df_combined['total_arrivals'] > 0) & (df_combined['tourist_nights_mn'] > 0),
        (df_combined['tourist_nights_mn'] * 1_000_000) / df_combined['total_arrivals'],
        df_combined['avg_los']
    )

    df_combined['avg_rptd_usd'] = np.where(
        df_combined['avg_los'] > 0,
        df_combined['avg_rpt_usd'] / df_combined['avg_los'],
        0.0
    )

    # --- Compute Year-over-Year Growth by Scenario ---
    
    # Sort chronologically & by scenario
    df_combined.sort_values(by=['scenario', 'year'], inplace=True)
    
    # The trick here is that "historical" transitions into forecasts.
    # To properly calculate YoY for a forecast's first year, we need the last historical year as a base.
    # Let's create a full timeline per scenario by appending the historical data to each forecast scenario temporarily.
    
    hist_only = df_combined[df_combined['scenario'] == 'historical'].copy()
    hist_only.sort_values('year', inplace=True)
    historical_yoy = hist_only['revenue_usd_mn'].pct_change() * 100
    hist_only['rev_yoy_pct'] = historical_yoy
    
    fcst_results = []
    scenarios = df_combined[df_combined['is_forecast']]['scenario'].unique()
    
    for scn in scenarios:
        scn_df = df_combined[df_combined['scenario'] == scn].copy()
        
        # Check if we need to prepend the last historical year to compute first-year YoY
        if not scn_df.empty and not hist_only.empty:
            scn_min_year = scn_df['year'].min()
            last_hist = hist_only[hist_only['year'] < scn_min_year]
            if not last_hist.empty:
                last_hist_year = last_hist.iloc[-1:]
                # Concat the last historical year to compute pct_change safely
                temp_series = pd.concat([last_hist_year, scn_df]).sort_values('year')
                scn_df['rev_yoy_pct'] = temp_series['revenue_usd_mn'].pct_change() * 100
            else:
                scn_df['rev_yoy_pct'] = scn_df['revenue_usd_mn'].pct_change() * 100
        else:
            scn_df['rev_yoy_pct'] = scn_df['revenue_usd_mn'].pct_change() * 100
            
        fcst_results.append(scn_df)
        
    if fcst_results:
        df_final = pd.concat([hist_only] + fcst_results, ignore_index=True)
    else:
        df_final = hist_only
        
    # Re-sort for final output: year asc, historical on top of scenarios
    # Just standard ascending by year, then scenario works well.
    df_final.sort_values(by=['year', 'scenario'], inplace=True, ascending=[True, True])
    df_final.reset_index(drop=True, inplace=True)

    # --- Finalize Output Canonical Schema ---
    
    canonical_columns = [
        'year', 'scenario', 'is_forecast', 'total_arrivals', 'revenue_usd_mn', 
        'revenue_usd_bn', 'revenue_lkr_mn', 'revenue_lkr_bn', 'tourist_nights_mn', 
        'avg_los', 'avg_rpt_usd', 'avg_rptd_usd', 'avg_usd_lkr', 'rev_yoy_pct'
    ]
    
    for col in canonical_columns:
        if col not in df_final.columns:
            df_final[col] = None
            
    out_df = df_final[canonical_columns].copy()
    
    # Format and rounding
    out_df['year'] = out_df['year'].fillna(0).astype(int)
    out_df['total_arrivals'] = out_df['total_arrivals'].fillna(0).astype(int)
    out_df['is_forecast'] = out_df['is_forecast'].astype(bool)
    
    float_cols_to_round = ['revenue_usd_mn', 'revenue_usd_bn', 'tourist_nights_mn', 
                           'avg_los', 'avg_rpt_usd', 'avg_rptd_usd', 'rev_yoy_pct']
    for col in float_cols_to_round:
        out_df[col] = out_df[col].astype(float).round(4)
        
    if out_df['revenue_lkr_mn'].notna().any():
        out_df['revenue_lkr_mn'] = out_df['revenue_lkr_mn'].astype(float).round(2)
        out_df['revenue_lkr_bn'] = out_df['revenue_lkr_bn'].astype(float).round(4)
    if out_df['avg_usd_lkr'].notna().any():
        out_df['avg_usd_lkr'] = out_df['avg_usd_lkr'].astype(float).round(2)

    return out_df
