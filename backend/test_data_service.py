import traceback
import sys
sys.path.append('D:/RP')
from backend.services.rev_data_service import get_revenue_data_service

try:
    svc = get_revenue_data_service()
    print('Monthly Shape:', svc.get_monthly_data(scenario='baseline').shape)
    print('Annual Shape:', svc.get_annual_data(scenario='baseline').shape)
    print('KPIs:', svc.get_combined_kpis('baseline', 2024))
except Exception as e:
    with open('test_error_log.txt', 'w') as f:
        f.write(traceback.format_exc())
