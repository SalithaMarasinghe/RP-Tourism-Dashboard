"""CSV loader utilities for Feature Card 3: Demographic Cohort Tracker.

This module loads and cleans the demographic cohort tracker CSV into a
production-ready pandas DataFrame for downstream services.
"""

from __future__ import annotations

from pathlib import Path
import re
from typing import Iterable

import pandas as pd
from pandas import DataFrame, Series


CSV_FILENAME = "demographic_cohort_tracker_2010_2025.csv"

REQUIRED_COLUMNS: tuple[str, ...] = (
    "report_year",
    "gender_male",
    "gender_female",
    "age_below_10",
    "age_10_19",
    "age_20_29",
    "age_30_39",
    "age_40_49",
    "age_50_59",
    "age_60_plus",
    "purpose_leisure",
    "purpose_business",
    "purpose_vfr",
    "purpose_transit",
    "purpose_other",
    "top_source_markets",
    "note",
)

TEXT_COLUMNS: set[str] = {"top_source_markets", "note"}

NUMERIC_COLUMNS: tuple[str, ...] = tuple(
    column for column in REQUIRED_COLUMNS if column not in TEXT_COLUMNS
)


def _to_snake_case(name: str) -> str:
    """Convert an input header to normalized snake_case."""
    cleaned = name.strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", "_", cleaned)
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    return cleaned


def _resolve_csv_path(csv_filename: str = CSV_FILENAME) -> Path:
    """Resolve CSV path from backend/forecasts/data."""
    backend_root = Path(__file__).resolve().parents[2]
    candidates = [
        backend_root / "forecasts" / "data" / csv_filename,
        backend_root.parent / "backend" / "forecasts" / "data" / csv_filename,
    ]

    for path in candidates:
        if path.exists():
            return path

    searched = ", ".join(str(path) for path in candidates)
    raise FileNotFoundError(
        f"Demographic CSV not found. Expected '{csv_filename}' in: {searched}"
    )


def validate_required_columns(
    df: DataFrame, required_columns: Iterable[str] = REQUIRED_COLUMNS
) -> None:
    """Validate that all required columns are present in the DataFrame."""
    required = set(required_columns)
    present = set(df.columns)
    missing = sorted(required - present)
    if missing:
        raise ValueError(
            "Missing required demographic columns: "
            f"{', '.join(missing)}. Found columns: {', '.join(sorted(present))}"
        )


def parse_percentage_fields(df: DataFrame, columns: Iterable[str]) -> DataFrame:
    """Parse numeric columns, converting percentage strings (e.g., '54.1%') to floats.

    Rules:
    - Blank values become null (NA)
    - Strings ending with '%' are converted to float percentages
    - Commas are removed before numeric conversion
    - Non-parsable values are set to null
    """
    for column in columns:
        if column not in df.columns:
            continue

        raw: Series = df[column].astype("string").str.strip()
        raw = raw.replace("", pd.NA)
        normalized = raw.str.replace("%", "", regex=False).str.replace(",", "", regex=False)
        df[column] = pd.to_numeric(normalized, errors="coerce").astype("Float64")

    return df


def load_demographic_csv(csv_path: str | Path | None = None) -> DataFrame:
    """Load and clean demographic cohort tracker CSV.

    Processing steps:
    1. Resolve CSV location from forecasts/data folder
    2. Load with blanks as null
    3. Normalize headers to snake_case
    4. Validate required schema columns
    5. Parse numeric / percentage fields
    6. Preserve text fields (top_source_markets, note) as nullable strings
    7. Validate report_year integrity

    Returns:
        Clean pandas DataFrame ready for service/analytics usage.
    """
    path = Path(csv_path) if csv_path is not None else _resolve_csv_path()

    if not path.exists():
        raise FileNotFoundError(f"Demographic CSV not found at: {path}")

    try:
        df = pd.read_csv(
            path,
            dtype="string",
            keep_default_na=True,
            na_values=["", " ", "NA", "N/A", "NULL", "null", "None"],
        )
    except Exception as exc:
        raise ValueError(f"Failed to read demographic CSV '{path}': {exc}") from exc

    df.columns = [_to_snake_case(str(column)) for column in df.columns]
    validate_required_columns(df)

    # Ensure text fields remain clean nullable strings.
    for column in TEXT_COLUMNS:
        df[column] = df[column].astype("string").str.strip().replace("", pd.NA)

    # Parse all numeric fields (including percentage-formatted values).
    df = parse_percentage_fields(df, NUMERIC_COLUMNS)

    # report_year must be valid integer year.
    year_numeric = pd.to_numeric(df["report_year"], errors="coerce")
    invalid_year_mask = year_numeric.isna() | (year_numeric % 1 != 0)
    if invalid_year_mask.any():
        bad_rows = (df.index[invalid_year_mask] + 2).tolist()  # +2 accounts for header + 1-index
        raise ValueError(
            "Invalid report_year detected in demographic CSV at row(s): "
            f"{', '.join(map(str, bad_rows))}"
        )
    df["report_year"] = year_numeric.astype("Int64")

    return df


__all__ = [
    "CSV_FILENAME",
    "REQUIRED_COLUMNS",
    "validate_required_columns",
    "parse_percentage_fields",
    "load_demographic_csv",
]
