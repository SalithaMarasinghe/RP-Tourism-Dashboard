import calendar
import pandas as pd
from typing import Dict

def get_month_number(month_abbr: str) -> int:
    """
    Helper function to map month abbreviations (Jan-Dec) to month numbers (1-12).
    
    Args:
        month_abbr (str): The 3-letter month abbreviation.
        
    Returns:
        int: The numeric value of the month (1-12).
        
    Raises:
        ValueError: If the abbreviation does not match a valid month.
    """
    # Create a mapping dictionary lazily or use calendar
    abbr_to_num: Dict[str, int] = {v.lower(): k for k, v in enumerate(calendar.month_abbr) if k > 0}
    clean_abbr = str(month_abbr).strip().lower()
    
    # Handle edge case where full month name or custom name might be provided
    # Fallback to standard 3-letter extraction
    if clean_abbr not in abbr_to_num:
        clean_abbr = clean_abbr[:3]
        
    if clean_abbr not in abbr_to_num:
        raise ValueError(f"Invalid month abbreviation: {month_abbr}")
        
    return abbr_to_num[clean_abbr]


def transform_monthly_arrivals_wide_to_long(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converts a historical monthly arrivals DataFrame from wide format 
    (Year, Jan, Feb, ..., Dec) into a long time-series format.
    
    Expected Input columns:
        ['year', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        
    Output columns:
        ['ds', 'year', 'month', 'arrivals']
        
    Args:
        df (pd.DataFrame): Wide format pandas DataFrame.
        
    Returns:
        pd.DataFrame: Long format pandas DataFrame ready for analysis.
    """
    # Create a copy to avoid SettingWithCopyWarning
    work_df = df.copy()
    
    # Ensure all column names are lowercase for easier matching
    work_df.columns = [str(col).lower().strip() for col in work_df.columns]
    
    if 'year' not in work_df.columns:
        raise ValueError("The input DataFrame must contain a 'year' column.")
        
    # Standard month columns we expect
    month_cols = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    
    # Use pandas 'melt' to unpivot the dataframe from wide to long
    long_df = work_df.melt(
        id_vars=['year'], 
        value_vars=[col for col in month_cols if col in work_df.columns],
        var_name='month_str', 
        value_name='arrivals'
    )
    
    # Drop rows that have NaN or empty arrival values completely
    long_df = long_df.dropna(subset=['arrivals', 'year'])
    
    # Convert 'arrivals' to string, remove commas, then to numeric, coercing errors to NaN
    long_df['arrivals'] = long_df['arrivals'].astype(str).str.replace(',', '', regex=False)
    long_df['arrivals'] = pd.to_numeric(long_df['arrivals'], errors='coerce')
    
    # Drop rows where 'arrivals' became NaN (e.g., if there were string letters instead of numbers)
    long_df = long_df.dropna(subset=['arrivals'])
    
    # Parse as integers safely
    long_df['arrivals'] = long_df['arrivals'].astype(int)
    long_df['year'] = long_df['year'].astype(int)
    
    # Convert the month string abbreviations to month numbers
    long_df['month'] = long_df['month_str'].apply(get_month_number)
    
    # Create the 'ds' date column representing the first day of that month
    # padding month with 0 using pandas formatting
    long_df['ds'] = pd.to_datetime(
        long_df['year'].astype(str) + '-' + long_df['month'].astype(str).str.zfill(2) + '-01',
        format='%Y-%m-%d'
    )
    
    # Select the final required columns
    out_df = long_df[['ds', 'year', 'month', 'arrivals']].copy()
    
    # Sort chronologically
    out_df = out_df.sort_values(by=['year', 'month']).reset_index(drop=True)
    
    return out_df
