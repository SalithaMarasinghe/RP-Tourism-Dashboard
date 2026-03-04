"""
server.py
~~~~~~~~~
Application bootstrap: creates the FastAPI app, registers middleware,
and mounts all routers. No business logic lives here.
"""
import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from routers import (
    auth_router,
    chat_router,
    core_router,
    forecast_router,
    rag_router,
    search_router,
    tdms_router,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(title="Tourism Dashboard API")

# ── CORS ─────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
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
app.include_router(rag_router.router)
app.include_router(tdms_router.router)
app.include_router(search_router.router)
