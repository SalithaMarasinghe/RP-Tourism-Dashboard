import os
import re
from typing import List, Optional

import pandas as pd

# Define the absolute path to the data directory based on the location of this service module
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'forecasts', 'data')


def _to_snake_case(name: str) -> str:
    """
    Convert a string to snake_case.
    Handles CamelCase, PascalCase, and spaces/hyphens.
    
    Args:
        name (str): Original column name.
        
    Returns:
        str: Normalized snake_case column name.
    """
    s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name.strip())
    s2 = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
    return re.sub(r'[\s\-]+', '_', s2)


def load_and_validate_csv(
    file_name: str,
    required_columns: List[str],
    date_columns: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Core helper function to load a CSV, normalize columns to snake_case,
    validate existence of required fields, and safely parse dates.
    
    Args:
        file_name (str): The name of the CSV file in the forecasts/data directory.
        required_columns (List[str]): List of column names (in snake_case) that MUST exist.
        date_columns (Optional[List[str]]): List of column names (in snake_case) to parse as datetime objects.
        
    Returns:
        pd.DataFrame: A validated, clean pandas DataFrame.
        
    Raises:
        FileNotFoundError: If the specified file does not exist.
        ValueError: If any required columns are missing from the dataframe.
    """
    file_path = os.path.join(DATA_DIR, file_name)
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Required data file not found: {file_path}")
        
    # Load the CSV
    df = pd.read_csv(file_path)
    
    # Normalize column names to snake_case
    df.columns = [_to_snake_case(str(col)) for col in df.columns]
    
    # Validate required columns
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        raise ValueError(
            f"Failed to load '{file_name}': Missing required columns: {missing_cols}. "
            f"Available columns are: {list(df.columns)}"
        )
        
    # Parse date columns safely (coercing errors to NaT)
    if date_columns:
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
                
    return df


def load_revenue_monthly_ml() -> pd.DataFrame:
    """
    Load the Monthly ML Revenue dataset.
    
    Returns:
        pd.DataFrame: Cleaned and validated dataset.
    """
    # Adjust the required columns depending on the actual shape of your dataset.
    required = ["period", "year", "month", "scenario"]
    dates = ["period"]
    return load_and_validate_csv("revenue_monthly_ml.csv", required, dates)


def load_revenue_annual_ml() -> pd.DataFrame:
    """
    Load the Annual ML Revenue dataset.
    
    Returns:
        pd.DataFrame: Cleaned and validated dataset.
    """
    required = ["year", "scenario"]
    return load_and_validate_csv("revenue_annual_ml.csv", required)


def load_m1_usdlkr_forecast() -> pd.DataFrame:
    """
    Load the USD/LKR Exchange Rate forecast dataset.
    
    Returns:
        pd.DataFrame: Cleaned and validated dataset.
    """
    required = ["date", "usd_lkr_pred"]
    dates = ["date"]
    return load_and_validate_csv("m1_usdlkr_forecast.csv", required, dates)


def load_monthly_arrivals_clean() -> pd.DataFrame:
    """
    Load the clean Monthly Tourist Arrivals dataset.
    
    Returns:
        pd.DataFrame: Cleaned and validated dataset.
    """
    required = ["year", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    return load_and_validate_csv("prompt4_monthly_arrivals_clean.csv", required)


def load_volume_revenue_clean() -> pd.DataFrame:
    """
    Load the clean clean Annual Volume and Revenue dataset (prompt 1).
    From this file, we typically extract annual totals for arrivals, tourism nights, and revenue.
    
    Returns:
        pd.DataFrame: Cleaned and validated dataset.
    """
    required = ["year", "total_arrivals", "revenue_usd_mn", "revenue_lkr_mn"]
    return load_and_validate_csv("prompt1_volume_revenue_clean-9.csv", required)
