from fastapi import FastAPI, APIRouter, Request, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import json
import pandas as pd
from collections import defaultdict


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# In-memory storage for status checks (replacing MongoDB)
status_checks_storage = []

# TDMS Data loader - optimized for instant lookups
tdms_data = None
tdms_by_date = None
tdms_by_site = None
available_dates = None
available_sites = None

def load_tdms_data():
    """Load and optimize TDMS CSV data for instant lookups"""
    global tdms_data, tdms_by_date, tdms_by_site, available_dates, available_sites
    
    csv_path = ROOT_DIR / "forecasts" / "Future_Tourism_Forecast_5Years.csv"
    if not csv_path.exists():
        return False
    
    # Load CSV
    df = pd.read_csv(csv_path)
    tdms_data = df.to_dict('records')
    
    # Create optimized lookup dictionaries
    tdms_by_date = defaultdict(list)
    tdms_by_site = defaultdict(list)
    
    for record in tdms_data:
        tdms_by_date[record['date']].append(record)
        tdms_by_site[record['site']].append(record)
    
    # Get unique dates and sites
    available_dates = sorted(df['date'].unique())
    available_sites = sorted(df['site'].unique())
    
    return True

# Load data on startup
load_tdms_data()


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
from auth import get_current_user

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, user: dict = Security(get_current_user)):
    # User is authenticated here
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    status_checks_storage.append(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    return [StatusCheck(**status_check) for status_check in status_checks_storage]

@api_router.get("/forecasts/scenarios")
async def get_forecast_scenarios():
    reports_dir = ROOT_DIR / "forecasts" / "explainability_reports"
    
    scenarios = {}
    files = {
        "baseline": "baseline_explainability_report.json",
        "optimistic": "optimistic_explainability_report.json",
        "pessimistic": "pessimistic_explainability_report.json"
    }
    
    import json
    
    for key, filename in files.items():
        file_path = reports_dir / filename
        if file_path.exists():
            with open(file_path, "r") as f:
                scenarios[key] = json.load(f)
        else:
            scenarios[key] = []
            
    return scenarios

@api_router.get("/forecasts/daily")
async def get_daily_forecasts():
    reports_dir = ROOT_DIR / "forecasts" / "daily_predictions"
    
    scenarios = {}
    files = {
        "baseline": "baseline_daily_predictions_2026_2030.json",
        "optimistic": "optimistic_daily_predictions_2026_2030.json",
        "pessimistic": "pessimistic_daily_predictions_2026_2030.json"
    }
    
    import json
    
    for key, filename in files.items():
        file_path = reports_dir / filename
        if file_path.exists():
            with open(file_path, "r") as f:
                daily_data = json.load(f)
                # Transform data to include year and month for filtering
                for item in daily_data:
                    date_parts = item['date'].split('-')
                    item['year'] = int(date_parts[0])
                    item['month'] = int(date_parts[1])
                    item['day'] = int(date_parts[2])
                    item['total_forecast'] = item.pop('arrivals_forecast')
                scenarios[key] = daily_data
        else:
            scenarios[key] = []
            
    return scenarios

# TDMS Endpoints
@api_router.get("/tdms/dates")
async def get_tdms_dates():
    """Get all available dates in TDMS data"""
    if available_dates is None:
        return {"dates": []}
    return {"dates": available_dates}

@api_router.get("/tdms/sites")
async def get_tdms_sites():
    """Get all available sites in TDMS data"""
    if available_sites is None:
        return {"sites": []}
    return {"sites": available_sites}

@api_router.get("/tdms/date/{date}")
async def get_tdms_by_date(date: str):
    """Get all site records for a specific date"""
    if tdms_by_date is None or date not in tdms_by_date:
        return {"data": []}
    return {"data": tdms_by_date[date]}

@api_router.get("/tdms/site/{site}")
async def get_tdms_by_site(site: str):
    """Get 5-year trend data for a specific site"""
    if tdms_by_site is None or site not in tdms_by_site:
        return {"data": []}
    return {"data": tdms_by_site[site]}

@api_router.get("/tdms/reload")
async def reload_tdms_data():
    """Reload TDMS data from CSV"""
    success = load_tdms_data()
    return {"success": success, "message": "Data reloaded" if success else "Failed to reload data"}

@api_router.get("/tdms/dashboard/{date}")
async def get_tdms_dashboard(date: str):
    """Get dashboard summary for a specific date"""
    if tdms_by_date is None or date not in tdms_by_date:
        return {
            "total_visitors": 0,
            "hotspot_count": 0,
            "highest_loaded_site": None,
            "vli_scores": []
        }
    
    records = tdms_by_date[date]
    total_visitors = sum(record['predicted_total_visitors'] for record in records)
    hotspot_count = sum(1 for record in records if record['vli_score'] > 120)
    
    highest_loaded = max(records, key=lambda x: x['vli_score'])
    highest_loaded_site = {
        "name": highest_loaded['site'],
        "vli_score": highest_loaded['vli_score'],
        "visitors": highest_loaded['predicted_total_visitors']
    }
    
    vli_scores = [
        {
            "site": record['site'],
            "vli_score": round(record['vli_score'], 1),
            "visitors": record['predicted_total_visitors'],
            "capacity": record['statistical_capacity']
        }
        for record in records
    ]
    
    return {
        "total_visitors": total_visitors,
        "hotspot_count": hotspot_count,
        "highest_loaded_site": highest_loaded_site,
        "vli_scores": vli_scores
    }

@api_router.get("/tdms/monthly/{site}/{year}")
async def get_monthly_aggregation(site: str, year: str):
    """Get monthly aggregation for a specific site and year"""
    if tdms_by_site is None or site not in tdms_by_site:
        return {"monthly_data": []}
    
    # Filter data for the specific site and year
    site_data = [record for record in tdms_by_site[site] if record['date'].startswith(year)]
    
    # Aggregate by month
    monthly_data = {}
    for record in site_data:
        month = record['date'][5:7]  # Extract MM from YYYY-MM-DD
        month_name = datetime.strptime(month, '%m').strftime('%B')
        
        if month_name not in monthly_data:
            monthly_data[month_name] = {
                'month': month_name,
                'total_visitors': 0,
                'avg_vli': 0,
                'record_count': 0
            }
        
        monthly_data[month_name]['total_visitors'] += record['predicted_total_visitors']
        monthly_data[month_name]['avg_vli'] += record['vli_score']
        monthly_data[month_name]['record_count'] += 1
    
    # Calculate averages
    for month_data in monthly_data.values():
        if month_data['record_count'] > 0:
            month_data['avg_vli'] = month_data['avg_vli'] / month_data['record_count']
        del month_data['record_count']
    
    # Sort by month order
    month_order = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December']
    sorted_monthly = [monthly_data.get(month, None) for month in month_order if monthly_data.get(month)]
    
    # Calculate KPIs
    yearly_peak = max(monthly_data.values(), key=lambda x: x['total_visitors']) if monthly_data else None
    avg_monthly_volume = sum(m['total_visitors'] for m in monthly_data.values()) / len(monthly_data) if monthly_data else 0
    
    return {
        "monthly_data": sorted_monthly,
        "yearly_peak": yearly_peak,
        "avg_monthly_volume": avg_monthly_volume
    }

@api_router.get("/tdms/weekly-trend/{site}")
async def get_weekly_trend(site: str):
    """Get weekly downsampled trend data for 5-year period"""
    if tdms_by_site is None or site not in tdms_by_site:
        return {"trend_data": []}
    
    site_data = tdms_by_site[site]
    
    # Sort by date
    site_data.sort(key=lambda x: x['date'])
    
    # Downsample to weekly (take every 7th data point)
    weekly_data = []
    for i in range(0, len(site_data), 7):
        record = site_data[i]
        weekly_data.append({
            'date': record['date'],
            'visitors': record['predicted_total_visitors'],
            'vli_score': record['vli_score']
        })
    
    return {"trend_data": weekly_data}

# Web Search Model
class SearchQuery(BaseModel):
    query: str

# Web Search Endpoint
@api_router.post("/search/web")
async def web_search(search_query: SearchQuery):
    """Perform web search for tourism information"""
    import requests
    
    try:
        query = search_query.query
        search_results = []
        
        # Use DuckDuckGo API (no API key required)
        search_params = {
            'q': query,
            'format': 'json',
            'pretty': 1
        }
        
        # Make the request from backend (no CORS issues)
        response = requests.get(
            'https://api.duckduckgo.com/',
            params=search_params,
            timeout=5
        )
        
        if response.status_code == 200:
            search_data = response.json()
            
            # Extract relevant information from DuckDuckGo response
            if search_data.get('Abstract') and len(search_data.get('Abstract', '')) > 30:
                search_results.append({
                    'title': search_data.get('Heading', 'Search Result'),
                    'link': search_data.get('AbstractURL', ''),
                    'snippet': search_data.get('Abstract', '')[:400]
                })
            
            # Also check RelatedTopics for additional results
            if search_data.get('RelatedTopics'):
                for topic in search_data.get('RelatedTopics', [])[:3]:
                    if isinstance(topic, dict) and topic.get('Text'):
                        title_snippet = topic['Text'].split(' - ')
                        search_results.append({
                            'title': title_snippet[0] if title_snippet else 'Result',
                            'snippet': title_snippet[1] if len(title_snippet) > 1 else title_snippet[0],
                            'link': topic.get('FirstURL', '')
                        })
        
        # Fallback to Wikipedia if no DuckDuckGo results
        if not search_results:
            try:
                wiki_query = 'Tourism in Sri Lanka' if 'attraction' in query.lower() or 'place' in query.lower() else 'Sri Lanka tourism'
                wiki_response = requests.get(
                    f'https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_query}',
                    timeout=5
                )
                
                if wiki_response.status_code == 200:
                    wiki_data = wiki_response.json()
                    search_results.append({
                        'title': wiki_data.get('title', 'Sri Lanka Tourism'),
                        'link': wiki_data.get('content_urls', {}).get('desktop', {}).get('page', ''),
                        'snippet': wiki_data.get('extract', 'General tourism information about Sri Lanka')[:400]
                    })
            except Exception as e:
                logger.warning(f"Wikipedia fallback failed: {e}")
        
        return {
            'success': True,
            'results': search_results,
            'query': query
        }
    
    except Exception as e:
        logger.error(f"Web search error: {e}")
        return {
            'success': False,
            'results': [],
            'error': str(e)
        }

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add CORS headers to all responses
@app.middleware("http")
async def add_cors_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Add middleware to log requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    # Ensure CORS headers are set on all responses
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Include the router in the main app
app.include_router(api_router)

# Test endpoint to verify CORS is working
@api_router.get("/test")
async def test_endpoint():
    return {"message": "CORS is working!"}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

