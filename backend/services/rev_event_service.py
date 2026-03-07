import pandas as pd

def apply_event_flags(df: pd.DataFrame) -> pd.DataFrame:
    """
    Annotates a monthly tourism DataFrame with known historical anomaly 
    event flags based on the 'ds' datestamp.
    
    Known Events Configured:
        - 2019-04-01 -> Easter attacks
        - 2020-03-01 to 2021-12-01 -> COVID collapse
        - 2022-04-01 to 2022-12-01 -> Economic crisis
        - 2024-01-01 onward -> Recovery phase
        
    Args:
        df (pd.DataFrame): The input pandas DataFrame representing the monthly timeline. 
            Must contain a datetime 'ds' column.
            
    Returns:
        pd.DataFrame: A new DataFrame with the appended/updated 'event_flag' column.
    """
    if 'ds' not in df.columns:
        raise ValueError("Cannot apply event flags: DataFrame does not contain a 'ds' column.")
        
    out_df = df.copy()
    
    # Ensure 'ds' is actually a datetime object for safe comparisons
    out_df['ds'] = pd.to_datetime(out_df['ds'])
    
    # Initialize the event flag to None for all rows
    out_df['event_flag'] = None
    
    # 1. Easter Attacks
    # Typically affects April 2019 exactly and its immediate aftermath.
    out_df.loc[out_df['ds'] == '2019-04-01', 'event_flag'] = 'Easter attacks'
    
    # 2. COVID-19 Collapse
    # From March 2020 through the end of 2021.
    covid_mask = (out_df['ds'] >= '2020-03-01') & (out_df['ds'] <= '2021-12-01')
    out_df.loc[covid_mask, 'event_flag'] = 'COVID collapse'
    
    # 3. Economic Crisis
    # Escalated starting April 2022 through to the end of the year.
    crisis_mask = (out_df['ds'] >= '2022-04-01') & (out_df['ds'] <= '2022-12-01')
    out_df.loc[crisis_mask, 'event_flag'] = 'Economic crisis'
    
    # 4. Recovery Phase
    # The bounce-back marking systemic stability return.
    recovery_mask = (out_df['ds'] >= '2024-01-01')
    out_df.loc[recovery_mask, 'event_flag'] = 'Recovery phase'
    
    # Also update 'anomaly_flag' dynamically if it exists in the schema to match
    # these severe structural breaks.
    if 'anomaly_flag' in out_df.columns:
        # We consider Recovery a positive trend, but attacks/covid/crisis as severe anomalies
        anomaly_mask = out_df['event_flag'].isin(['Easter attacks', 'COVID collapse', 'Economic crisis'])
        out_df['anomaly_flag'] = anomaly_mask
        
    return out_df
