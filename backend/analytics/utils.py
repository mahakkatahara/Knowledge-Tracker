import math
from datetime import datetime, timezone, date, time
from typing import Union, Optional

def js_round(val: float) -> int:
    """
    Replicates JavaScript's Math.round() behavior.
    In JavaScript, Math.round() rounds half-up (e.g. 2.5 rounds to 3, -2.5 rounds to -2).
    In Python, round() uses round-to-even (Banker's rounding).
    """
    return math.floor(val + 0.5)

def get_days_elapsed(
    last_studied: Optional[str],
    reference_date: Optional[Union[str, date, datetime]] = None
) -> int:
    """
    Calculates the calendar days elapsed between two dates.
    If reference_date is not provided, the current system date/time (in UTC) is used.
    
    Matches the JavaScript behavior where:
    - Target date string YYYY-MM-DD is parsed as UTC midnight.
    - Reference date (if string) is parsed as UTC midnight.
    - Fallback is the current system date/time.
    - Difference in days is rounded up using Math.ceil().
    """
    if not last_studied:
        return 0
        
    try:
        # Parse last_studied (always expected as YYYY-MM-DD string)
        target_dt = datetime.strptime(last_studied, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return 0

    # Determine reference datetime in UTC
    if reference_date is None:
        current_dt = datetime.now(timezone.utc)
    elif isinstance(reference_date, str):
        current_dt = datetime.strptime(reference_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    elif isinstance(reference_date, datetime):
        current_dt = reference_date.astimezone(timezone.utc)
    elif isinstance(reference_date, date):
        current_dt = datetime.combine(reference_date, time.min, tzinfo=timezone.utc)
    else:
        raise TypeError("reference_date must be None, str, date, or datetime")

    # Difference in seconds
    diff_seconds = (current_dt - target_dt).total_seconds()
    
    # Convert seconds to days and round up using ceiling to match calendar days (JavaScript logic)
    diff_days = math.ceil(diff_seconds / (24 * 3600))
    
    return max(0, diff_days)
