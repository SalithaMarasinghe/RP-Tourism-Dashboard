import numpy as np
import pandas as pd
from typing import List, Optional

def compute_robust_zscore(series: pd.Series, window: int = 12) -> pd.Series:
    """
    Computes a rolling robust Z-score based on the rolling median and Median Absolute Deviation (MAD).
    
    Robust Z-Score = (X - rolling_median) / (rolling_mad * 1.4826)
    
    Args:
        series (pd.Series): The pandas Series to analyze.
        window (int): The rolling window size (in months).
        
    Returns:
        pd.Series: The rolling robust Z-score.
    """
    rolling_median = series.rolling(window=window, min_periods=max(1, window // 2)).median()
    
    # Compute rolling MAD
    rolling_mad = series.rolling(window=window, min_periods=max(1, window // 2)).apply(
        lambda x: np.median(np.abs(x - np.median(x))), raw=True
    )
    
    # Avoid division by zero by replacing 0 MAD with a very small base number or NaN
    # If MAD is 0, it means all values in the window are identical.
    safe_mad = rolling_mad.replace(0, np.nan)
    
    # 1.4826 is the scaling factor to match standard deviation of a normal distribution
    robust_zscore = (series - rolling_median) / (safe_mad * 1.4826)
    
    # Fill cases where MAD was exactly 0. 
    # If value == median, zscore should be 0. If value != median, it's a massive spike (we leave as inf/large).
    robust_zscore = robust_zscore.fillna(0.0)
    
    return robust_zscore


def apply_anomaly_detection(
    df: pd.DataFrame,
    columns_to_check: Optional[List[str]] = None,
    window: int = 12,
    threshold: float = 3.0,
    include_forecast: bool = False
) -> pd.DataFrame:
    """
    Detects major negative and positive shocks in historical monthly tourism data
    using a rolling robust method (Median + MAD).
    
    Args:
        df (pd.DataFrame): Monthly dataframe sorted by 'ds'.
        columns_to_check (List[str]): Columns to analyze. Defaults to ['arrivals', 'revenue_usd_mn', 'rpt_usd'].
        window (int): The rolling window size for baseline median.
        threshold (float): Robust Z-score threshold for flagging an anomaly.
        include_forecast (bool): Flag to apply detection to forecast rows. By default, ignores forecasts.
        
    Returns:
        pd.DataFrame: A new DataFrame with 'anomaly_flag', 'anomaly_score', and 'anomaly_reason' appended.
    """
    if columns_to_check is None:
        columns_to_check = ['arrivals', 'revenue_usd_mn', 'rpt_usd']
        
    if 'ds' not in df.columns:
        raise ValueError("Input DataFrame must contain a 'ds' column.")
        
    out_df = df.copy()
    
    # Ensure dataframe is purely chronologically sorted for rolling maths
    out_df = out_df.sort_values(['scenario', 'ds']).reset_index(drop=True)
    
    # Setup necessary target fields
    if 'anomaly_flag' not in out_df.columns:
        out_df['anomaly_flag'] = None
    
    out_df['anomaly_score'] = 0.0
    out_df['anomaly_reason'] = None
    
    # Create an active masking layer so we don't accidentally flag ML predictions
    # as historical "anomalies", unless explicitly requested
    mask_to_check = out_df['is_forecast'] == False if ('is_forecast' in out_df.columns and not include_forecast) else pd.Series(True, index=out_df.index)
    
    # String builders representing the reason for the spike
    reasons = pd.Series("", index=out_df.index)
    max_scores = pd.Series(0.0, index=out_df.index)
    
    for col in columns_to_check:
        if col not in out_df.columns:
            continue
            
        # 1. Compute robust Z-score
        z_scores = compute_robust_zscore(out_df[col], window=window)
        
        # 2. Flag rows exceeding the threshold and within our allowed mask
        is_anomaly = (z_scores.abs() > threshold) & mask_to_check
        
        # 3. Track maximum deviance score
        max_scores = np.maximum(max_scores, z_scores.abs())
        
        # 4. Build legible NLP strings for the API output
        def get_direction(z):
            return "positive shock" if z > 0 else "negative shock"
            
        col_reason = pd.Series(
            np.where(
                is_anomaly, 
                col + " " + z_scores.apply(get_direction) + " (z=" + z_scores.round(1).astype(str) + ")",
                ""
            ),
            index=out_df.index
        )
        
        # Append reason string cleanly
        reasons = reasons + np.where((reasons != "") & (col_reason != ""), ", ", "") + col_reason
        
    # Apply calculation arrays to dataframe
    out_df['anomaly_score'] = max_scores.replace([np.inf, -np.inf], 99.9).round(2).fillna(0.0)
    out_df['anomaly_reason'] = reasons.replace("", None)
    
    # If previous logic (like rev_event_service) populated a string in 'anomaly_flag' like 'COVID collapse',
    # we should merge our new dynamic reasons into it to create a super-field.
    
    # Coerce anomaly_flag to string if it was boolean False from the builders
    out_df['anomaly_flag'] = out_df['anomaly_flag'].replace(False, None)
    
    combined_flags = []
    for idx, row in out_df.iterrows():
        existing_flag = row['anomaly_flag']
        new_reason = row['anomaly_reason']
        
        pieces = []
        if pd.notna(existing_flag) and isinstance(existing_flag, str):
            pieces.append(existing_flag)
        if pd.notna(new_reason):
            pieces.append(new_reason)
            
        combined_flags.append(" | ".join(pieces) if pieces else None)
        
    out_df['anomaly_flag'] = combined_flags
    out_df['anomaly_score'] = out_df['anomaly_score'].astype(float)
    
    return out_df
