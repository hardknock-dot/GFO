import pytest
from datetime import date
from app.routers.upload import fix_date_order, swap_month_day

def test_user_exact_case_start_swapped_end_unswapped():
    # User uploaded 01/05/2026 (Jan 5) and 01/30/2026 (Jan 30)
    # Excel/Parser interpreted 01/05/2026 as May 1, 2026 (2026-05-01)
    # 01/30/2026 was parsed as Jan 30, 2026 (2026-01-30) because month 30 is invalid.
    start_d = date(2026, 5, 1)
    end_d = date(2026, 1, 30)
    
    corrected_start, corrected_end = fix_date_order(start_d, end_d)
    
    assert corrected_start == date(2026, 1, 5)
    assert corrected_end == date(2026, 1, 30)
    assert corrected_end >= corrected_start

def test_end_swapped_start_unswapped():
    # Start date 2026-01-05 (Jan 5), End date parsed as 2026-01-02 from 02/01/2026 (user intended Feb 1)
    start_d = date(2026, 1, 5)
    end_d = date(2026, 1, 2)
    
    corrected_start, corrected_end = fix_date_order(start_d, end_d)
    
    assert corrected_start == date(2026, 1, 5)
    assert corrected_end == date(2026, 2, 1)
    assert corrected_end >= corrected_start

def test_both_swapped():
    # Start date parsed as 2026-05-01 (May 1), End date parsed as 2026-06-01 (June 1)
    # User intended Jan 5 to Jan 6
    start_d = date(2026, 5, 1)
    end_d = date(2026, 6, 1)
    # Since end_d (June 1) >= start_d (May 1), fix_date_order returns early without error
    corrected_start, corrected_end = fix_date_order(start_d, end_d)
    assert corrected_start == date(2026, 5, 1)
    assert corrected_end == date(2026, 6, 1)

def test_genuinely_invalid_date_order():
    # Start date 2026-06-15 (June 15), End date 2026-01-05 (Jan 5)
    # Day 15 > 12 so start cannot be swapped. Swapping end date gives 2026-05-01 (May 1), which is still < June 15.
    start_d = date(2026, 6, 15)
    end_d = date(2026, 1, 5)
    
    corrected_start, corrected_end = fix_date_order(start_d, end_d)
    
    assert corrected_start == date(2026, 6, 15)
    assert corrected_end == date(2026, 1, 5)
    assert corrected_end < corrected_start

print("ALL DATE AUTO-CORRECT TESTS PASSED!")
