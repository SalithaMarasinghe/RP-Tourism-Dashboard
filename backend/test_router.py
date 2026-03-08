import sys
sys.path.append('D:/RP')

from backend.services.rev_data_service import get_revenue_data_service
from backend.routers.rev import safe_replace_nan
from backend.models.revenue import MonthlyRevenueRecord, AnnualRevenueRecord

svc = get_revenue_data_service()
m_df = svc.get_monthly_data(scenario='baseline')
m_records = safe_replace_nan(m_df)

for i, rec in enumerate(m_records):
    try:
        MonthlyRevenueRecord.model_validate(rec)
    except Exception as e:
        print(f"Error in Monthly Record {i} (ds={rec.get('ds')}):")
        print(e)
        break

a_df = svc.get_annual_data(scenario='baseline')
a_records = safe_replace_nan(a_df)

for i, rec in enumerate(a_records):
    try:
        AnnualRevenueRecord.model_validate(rec)
    except Exception as e:
        print(f"Error in Annual Record {i} (year={rec.get('year')}):")
        print(e)
        break
        
print("Validation test complete.")
