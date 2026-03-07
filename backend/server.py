"""
server.py
~~~~~~~~~
Application bootstrap: creates the FastAPI app, registers middleware,
and mounts all routers. No business logic lives here.
"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from routers import (
    auth_router,
    chat_router,
    core_router,
    forecast_router,
    geopolitical_tile,
    rag_router,
    search_router,
    tdms_router,
    source_markets_router,
    source_market_geo_router,
    rev,
    revenue_geo,
)
from routers.geopolitical_tile import validate_env_vars, ConfigurationError
from services.geopolitical_tile_scheduler import run_scheduled_pipeline
from services import tourism_rag

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

_scheduler = AsyncIOScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle handler."""
    # ── Startup ────────────────────────────────────────────────────────────
    # 1. Validate required env vars for the geopolitical tile feature
    try:
        validate_env_vars()
        logger.info("Geopolitical tile env vars validated OK.")
    except ConfigurationError as exc:
        logger.error("STARTUP ERROR: %s", exc)
        raise

    # 2. Start APScheduler — 7-day interval pipeline refresh
    _scheduler.add_job(
        run_scheduled_pipeline,
        trigger=IntervalTrigger(days=7),
        id="geopolitical_scheduled_refresh",
        replace_existing=True,
        name="Geopolitical Tile — Scheduled Weekly Refresh",
    )
    _scheduler.start()
    logger.info("APScheduler started. Geopolitical refresh job registered (every 7 days).")

    # 3. Initialize RAG system
    logger.info("Initializing RAG system...")
    success = tourism_rag.initialize_rag_system()
    if success:
        logger.info("RAG system initialized successfully")
    else:
        logging.error("Failed to initialize RAG system")
    yield
    # ── Shutdown ────────────────────────────────────────────────────────────
    _scheduler.shutdown(wait=False)
    logger.info("APScheduler shut down cleanly.")

app = FastAPI(title="Tourism Dashboard API", lifespan=lifespan)

# ── CORS ─────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "https://sri-lanka-tourism-intelligence.web.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Static Files (for production) ───────────────────────────────────────────
if os.path.exists(ROOT_DIR / "../frontend/build"):
    app.mount("/static", StaticFiles(directory=ROOT_DIR / "../frontend/build/static"), name="static")

@app.get("/", include_in_schema=False)
async def read_index():
    """Serve the React app in production."""
    build_path = ROOT_DIR / "../frontend/build/index.html"
    if build_path.exists():
        return FileResponse(build_path)
    return {"message": "Tourism Dashboard API is running"}

@app.get("/healthz", tags=["Health"])
async def health_check():
    """Endpoint for Railway health checks."""
    return {"status": "ok"}

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(core_router.router)
app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(forecast_router.router)
app.include_router(geopolitical_tile.router)
app.include_router(rag_router.router)
app.include_router(tdms_router.router)
app.include_router(search_router.router)
app.include_router(source_markets_router.router)
app.include_router(source_market_geo_router.router)
app.include_router(rev.router)
app.include_router(revenue_geo.router)
