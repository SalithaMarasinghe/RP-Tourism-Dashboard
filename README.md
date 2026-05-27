<div align="center">

<!-- LOGO / HERO BANNER -->
<br />

<h1>🌴 Sri Lanka Tourism Intelligence Platform</h1>

<p align="center">
  <strong>An end-to-end Big Data & AI-powered analytics platform for tourism intelligence, forecasting, and strategic decision support.</strong>
</p>

<p align="center">
  <a href="https://sri-lanka-tourism-intelligence.web.app" target="_blank">
    <img src="https://img.shields.io/badge/Live%20Demo-Firebase%20Hosting-orange?style=for-the-badge&logo=firebase" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Backend-FastAPI%20on%20Railway-brightgreen?style=for-the-badge&logo=railway" alt="Backend" />
  <img src="https://img.shields.io/badge/Python-3.10-blue?style=for-the-badge&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/ML-Time%20Series%20%7C%20Deep%20Learning-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/NLP-RAG%20%7C%20Gemini%20AI-red?style=flat-square" />
  <img src="https://img.shields.io/badge/Vector%20DB-ChromaDB-blueviolet?style=flat-square" />
  <img src="https://img.shields.io/badge/Database-Firebase%20Firestore-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/Deployment-Docker%20%7C%20Railway%20%7C%20Firebase-blue?style=flat-square" />
</p>

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [ML & Data Pipeline](#-ml--data-pipeline)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Deployment](#-deployment)
  - [Backend — Railway (Docker)](#backend--railway-docker)
  - [Frontend — Firebase Hosting](#frontend--firebase-hosting)
- [API Reference](#-api-reference)
- [Data Sources & Pipeline](#-data-sources--pipeline)
- [Security & Compliance](#-security--compliance)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌐 Overview

The **Sri Lanka Tourism Intelligence Platform** is a full-stack, production-grade analytics and decision-support system built for tourism authorities and stakeholders. It ingests over 50 years of tourism arrival data (1971–2023), applies advanced Machine Learning and Deep Learning models, and exposes insights through an interactive React dashboard with an AI-powered conversational assistant.

The platform functions as a **single source of truth** for all tourism KPIs — combining historical analytics, predictive forecasting, geopolitical impact assessment, revenue intelligence, and sentiment analysis from visitor reviews into one unified interface.

### Problem Statement

Tourism authorities face fragmented data, reactive decision-making, and lack of forward-looking intelligence. This platform addresses that gap by providing:

- **Predictive**, not just descriptive analytics
- **Automated** ingestion, processing, and refreshing of intelligence layers
- **AI-augmented** natural-language query capabilities for non-technical stakeholders

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│   React 19 SPA  ·  Recharts  ·  Three.js  ·  TailwindCSS           │
│   Firebase Auth  ·  Google OAuth 2.0                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / REST
┌────────────────────────────▼────────────────────────────────────────┐
│                        API LAYER (FastAPI)                          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Forecast │  │  Revenue │  │  Source  │  │  Geopolitical    │   │
│  │  Router  │  │  Router  │  │  Markets │  │  Tile Router     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │   Chat   │  │   RAG    │  │  Review  │  │   Auth / TDMS    │   │
│  │  Router  │  │  Router  │  │  Intel.  │  │   Routers        │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                                     │
│  APScheduler (7-day Geopolitical Pipeline Refresh)                  │
└──────┬──────────────┬────────────────┬───────────────┬─────────────┘
       │              │                │               │
┌──────▼──┐   ┌───────▼──────┐  ┌─────▼────┐  ┌──────▼──────────────┐
│ ML/TS   │   │  ChromaDB    │  │ Firebase │  │  External APIs       │
│ Forecast│   │  Vector DB   │  │ Firestore│  │  Gemini · Groq       │
│ Models  │   │  (RAG Index) │  │ Auth     │  │  Tavily Web Search   │
└─────────┘   └──────────────┘  └──────────┘  └─────────────────────┘
```

### Data Flow

```
Raw CSV Dataset (1971–2023)
        │
        ▼
┌──────────────────────┐
│  Preprocessing       │  ← Jupyter Notebooks (ML/)
│  Arrival             │
│  Disaggregation      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐      ┌──────────────────────┐
│  Model Training      │      │  Forecasting Service  │
│  ML · TS · DL        │─────▶│  (Served via FastAPI) │
└──────────────────────┘      └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  ChromaDB Indexing   │  ← Tourism documents + forecast data
│  (RAG Pipeline)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  AI Chat Assistant   │  ← Gemini + RAG + Tavily Web Search
└──────────────────────┘
```

---

## ✨ Key Features

| Module | Description | Technology |
|--------|-------------|------------|
| 🔮 **Arrival Forecasting** | Predicts tourist arrivals using Time-Series, ML, and Deep Learning models trained on 50+ years of data | Prophet, LSTM, XGBoost |
| 💰 **Revenue Analytics** | Tracks geographic revenue distribution, identifies anomalies, and forecasts income streams | Pandas, NumPy, Recharts |
| 🗺️ **Geopolitical Intelligence** | Monitors global events, automatically refreshes risk tiles weekly via APScheduler | Groq LLM, APScheduler |
| 🎯 **Source Market Profiling** | Segments tourists by origin, demographics, and travel behavior for targeted marketing | Recharts, GeoJSON |
| ⭐ **Review Intelligence** | Sentiment & aspect-based analysis of visitor reviews across locations and landmarks | ChromaDB, Gemini AI |
| 💬 **AI Strategic Assistant** | Conversational interface with RAG-augmented context and live web search | Gemini, LangChain, Tavily |
| 🔍 **Knowledge Retrieval (RAG)** | Retrieval-Augmented Generation over tourism datasets for grounded, factual AI responses | ChromaDB, BM25, LangChain |
| 📊 **Interactive Dashboards** | React-based KPI dashboards with real-time charts, 3D globe, and exportable reports | Recharts, Three.js, jsPDF |
| 🔐 **Auth & TDMS** | Firebase Auth with Google OAuth 2.0 and per-user chat persistence | Firebase, Firestore |

---

## 🛠 Technology Stack

### Backend
| Layer | Technology | Version |
|-------|-----------|---------|
| API Framework | FastAPI | ≥ 0.115.0 |
| Server | Uvicorn (ASGI) | ≥ 0.30.0 |
| Data Processing | Pandas, NumPy | 3.0.1, 2.4.x |
| Vector Database | ChromaDB | ≥ 0.5.23 |
| LLM Orchestration | LangChain + Google GenAI | ≥ 0.2.0 / ≥ 1.0.7 |
| Generative AI | Google Gemini API | ≥ 0.7.2 |
| Fast Inference | Groq API | ≥ 0.4.0 |
| Web Search | Tavily Python | ≥ 0.3.3 |
| Keyword Retrieval | rank-bm25 | ≥ 0.2.2 |
| Task Scheduling | APScheduler | ≥ 3.10.0 |
| Auth Backend | Firebase Admin SDK | ≥ 6.2.0 |
| Validation | Pydantic v2 | ≥ 2.8.0 |
| Containerization | Docker (multi-stage) | Python 3.10-slim |

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.0.0 |
| Routing | React Router DOM | 7.x |
| UI Components | Radix UI + shadcn/ui | Latest |
| Styling | TailwindCSS | 3.x |
| Charts | Recharts | 2.x |
| 3D Rendering | Three.js + React Three Fiber | 0.183 / 9.x |
| Animation | GSAP, Motion | 3.x / 12.x |
| Forms | React Hook Form + Zod | 7.x / 3.x |
| PDF Export | jsPDF + jsPDF-AutoTable | 4.x / 5.x |
| Auth | Firebase SDK | 12.x |
| HTTP Client | Axios | 1.x |
| Build Tool | CRACO (CRA override) | 7.x |

### Infrastructure
| Component | Platform |
|-----------|---------|
| Backend Hosting | Railway (Docker container) |
| Frontend Hosting | Firebase Hosting |
| Database | Google Cloud Firestore |
| Authentication | Firebase Auth (Google OAuth 2.0) |
| CI/CD (Frontend) | `npm run deploy` → Firebase CLI |
| Container Registry | Docker Hub / Railway Registry |
| Health Monitoring | Railway health checks → `/healthz` |

---

## 🤖 ML & Data Pipeline

The machine learning pipeline is organized as a sequential series of Jupyter Notebooks located in the `ML/` directory.

### Pipeline Stages

```
ML/
├── 0. Raw Dataset.csv                          ← Raw historical arrivals (1971–2023)
├── 1. Preprocessing - Arrival_Disaggregation   ← Monthly disaggregation of annual data
├── 1. preprocessed-dataset.csv                 ← Output of disaggregation step
├── 2. Preprocessing - Preprocessing            ← Feature engineering, outlier removal
├── 3. Model_Exploration-ML                     ← Classical ML (XGBoost, Random Forest, SVR)
├── 4. Model_Exploration-TS                     ← Time-Series (SARIMA, Prophet, ETS)
├── 5. Model_Exploration-DL                     ← Deep Learning (LSTM, TCN, Transformer)
└── 6. Final_Model                              ← Ensemble / selected production model
```

### Model Selection Criteria

| Metric | Target |
|--------|--------|
| MAPE (Mean Absolute Percentage Error) | < 10% |
| RMSE | Minimized |
| Directional Accuracy | > 80% |
| Forecast Horizon | 12–36 months |

### Serving Forecasts

Trained model artifacts are persisted in `backend/forecasts/` and served via the `forecast_router` and `rev_forecast_builder` service. Forecasts are computed at startup and cached for performance.

---

## 📁 Project Structure

```
RP-Tourism-Dashboard/
│
├── ML/                              # Machine Learning pipeline (Jupyter Notebooks)
│   ├── 0. Raw Dataset.csv
│   ├── 1–6. *.ipynb                 # Sequential preprocessing → training notebooks
│   └── preprocessed-dataset.csv
│
├── backend/                         # FastAPI application
│   ├── server.py                    # App bootstrap, middleware, router mounts
│   ├── auth.py                      # Firebase token verification helpers
│   ├── Dockerfile                   # Multi-stage production Docker image
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # Environment variables (NOT committed)
│   │
│   ├── routers/                     # API route handlers
│   │   ├── auth_router.py
│   │   ├── chat_router.py
│   │   ├── core_router.py
│   │   ├── forecast_router.py
│   │   ├── geopolitical_tile.py
│   │   ├── rag_router.py
│   │   ├── rev.py                   # Revenue analytics
│   │   ├── revenue_geo.py           # Revenue geo-distribution
│   │   ├── review_intelligence.py
│   │   ├── search_router.py
│   │   ├── source_markets_router.py
│   │   ├── source_market_geo_router.py
│   │   ├── tdms_router.py
│   │   └── demo.py
│   │
│   ├── services/                    # Business logic layer
│   │   ├── tourism_rag.py           # RAG pipeline (ChromaDB + BM25 hybrid)
│   │   ├── chat_service.py          # Gemini + RAG + web search orchestration
│   │   ├── geopolitical_service.py  # Geopolitical intelligence (Groq LLM)
│   │   ├── geopolitical_tile_scheduler.py
│   │   ├── forecast_service.py
│   │   ├── source_markets_service.py
│   │   ├── source_market_geo_service.py
│   │   ├── review_intelligence_service.py
│   │   ├── rev_data_service.py      # Revenue data pipeline
│   │   ├── rev_forecast_builder.py
│   │   ├── rev_anomaly_service.py
│   │   ├── search_service.py        # Tavily web search wrapper
│   │   └── auth_service.py
│   │
│   ├── models/                      # Pydantic request/response schemas
│   ├── forecasts/                   # Serialized model outputs & CSV artifacts
│   ├── prompts/                     # LLM prompt templates
│   ├── vector database/             # ChromaDB persistent storage
│   └── cache/                       # Response cache
│
├── frontend/                        # React 19 SPA
│   ├── src/
│   │   ├── App.js                   # Root component + routing
│   │   ├── ChatbotTab.js            # AI assistant UI
│   │   ├── firebase.js              # Firebase SDK config
│   │   ├── api/                     # Axios API client modules
│   │   ├── components/              # Reusable UI components
│   │   ├── context/                 # React context providers
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── pages/                   # Page-level components
│   │   ├── lib/                     # Utility libraries
│   │   └── utils/                   # Helper functions
│   ├── package.json
│   ├── tailwind.config.js
│   ├── firebase.json
│   └── .env.production
│
├── firestore.rules                  # Firestore security rules
├── railway.toml                     # Railway deployment configuration
├── vercel.json                      # Vercel routing config (alternative)
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

Ensure the following tools are installed on your system:

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Python | 3.10 | [python.org](https://www.python.org/) |
| Node.js | 18.x LTS | [nodejs.org](https://nodejs.org/) |
| npm / yarn | npm 9+ / yarn 1.22+ | bundled with Node.js |
| Git | 2.x | [git-scm.com](https://git-scm.com/) |
| Docker *(optional, for containerized backend)* | 24.x | [docker.com](https://www.docker.com/) |

---

### Environment Variables

#### Backend — `backend/.env`

Create this file by copying the template below. **Never commit this file.**

```env
# ── Google Gemini ──────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here

# ── Groq (Geopolitical Intelligence LLM) ──────
GROQ_API_KEY=your_groq_api_key_here

# ── Tavily (Web Search) ────────────────────────
TAVILY_API_KEY=your_tavily_api_key_here

# ── Firebase Admin SDK ─────────────────────────
# Place your serviceAccountKey.json in backend/ (not committed)
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json

# ── Application ────────────────────────────────
PORT=8000
ENV=development
```

#### Frontend — `frontend/.env.local` *(development)* or `frontend/.env.production`

```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Config (from Firebase Console → Project Settings)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

> **How to get your API keys:**
> - **Gemini API Key** → [Google AI Studio](https://ai.google.dev) → Get API Key
> - **Groq API Key** → [console.groq.com](https://console.groq.com)
> - **Tavily API Key** → [app.tavily.com](https://app.tavily.com)
> - **Firebase Config** → [Firebase Console](https://console.firebase.google.com) → Project Settings → Your Apps
> - **Firebase Service Account** → Firebase Console → Project Settings → Service Accounts → Generate new private key

---

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/SalithaMarasinghe/RP-Tourism-Dashboard.git
cd RP-Tourism-Dashboard

# 2. Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Navigate to backend and install dependencies
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# 4. Configure environment variables
#    Copy the template above and create backend/.env
#    Place your Firebase serviceAccountKey.json in backend/

# 5. Start the development server
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at: **`http://localhost:8000`**

Interactive API docs (Swagger UI): **`http://localhost:8000/docs`**

ReDoc API docs: **`http://localhost:8000/redoc`**

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory (from project root)
cd frontend

# 2. Install dependencies
npm install
# or with yarn:
yarn install

# 3. Configure environment variables
#    Create frontend/.env.local with the values from the section above

# 4. Start the development server
npm start
# or:
yarn start
```

The React app will be available at: **`http://localhost:3000`**

---

## 🚢 Deployment

### Backend — Railway (Docker)

The backend is containerized using a multi-stage `Dockerfile` for minimal production image size.

```bash
# Build the Docker image locally (optional test)
cd backend
docker build -t tourism-backend:latest .
docker run -p 8000:8000 --env-file .env tourism-backend:latest
```

**Railway Deployment:**

1. Push your code to GitHub
2. Create a new Railway project and link the repository
3. Set all environment variables in Railway's dashboard under **Variables**
4. Railway will auto-detect `railway.toml` and build using the Dockerfile

```toml
# railway.toml — already configured
[build]
builder = "dockerfile"

[deploy]
startCommand = "exec uvicorn server:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/healthz"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

The health check endpoint is available at `GET /healthz`.

---

### Frontend — Firebase Hosting

```bash
# 1. Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Build and deploy in one command
cd frontend
npm run deploy
# This runs: npm run build && npx firebase deploy
```

The production frontend is hosted at:
**`https://sri-lanka-tourism-intelligence.web.app`**

---

## 📡 API Reference

All endpoints are prefixed with the backend base URL. The full interactive documentation is available at `/docs` (Swagger) once the backend is running.

| Router | Base Path | Description |
|--------|-----------|-------------|
| Core | `/api/` | Health check, base data endpoints |
| Auth | `/api/auth/` | Firebase token validation, user management |
| Forecast | `/api/forecast/` | Tourist arrival predictions |
| Revenue | `/api/rev/` | Revenue analytics, anomalies, forecasts |
| Revenue Geo | `/api/revenue-geo/` | Geographic revenue distribution |
| Geopolitical | `/api/geopolitical/` | Risk tiles, event impact analysis |
| Source Markets | `/api/source-markets/` | Arrival segmentation by origin |
| Source Market Geo | `/api/source-market-geo/` | Geographic market distribution |
| Review Intelligence | `/api/reviews/` | Sentiment & aspect analysis |
| Chat | `/api/chat/` | AI assistant (Gemini + RAG) |
| RAG | `/api/rag/` | Direct knowledge retrieval |
| Search | `/api/search/` | Tavily web search integration |
| TDMS | `/api/tdms/` | Tourism data management |
| Demo | `/api/demo/` | Demo data endpoints |

### Example Requests

```bash
# Health check
curl https://your-backend.railway.app/healthz

# Get tourist arrival forecast
curl https://your-backend.railway.app/api/forecast/arrivals

# Query the AI assistant
curl -X POST https://your-backend.railway.app/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <firebase_id_token>" \
  -d '{"message": "What are the peak tourism months for Sri Lanka?"}'

# Get revenue analytics
curl https://your-backend.railway.app/api/rev/summary
```

---

## 🗄 Data Sources & Pipeline

### Primary Dataset

| Attribute | Detail |
|-----------|--------|
| Source | Sri Lanka Tourism Development Authority (SLTDA) |
| Coverage | 1971 – 2023 (52 years) |
| Granularity | Annual arrivals → disaggregated to monthly |
| Features | Total arrivals, source country, revenue, purpose of visit |
| Format | CSV (raw), processed CSV (preprocessed) |

### Data Processing Pipeline

1. **Arrival Disaggregation** (`Notebook 1`) — Converts annual data to monthly using seasonal decomposition
2. **Preprocessing** (`Notebook 2`) — Handles missing values, outlier detection (COVID-19 adjustment), feature engineering (lag features, rolling averages, trend indicators)
3. **Model Exploration — ML** (`Notebook 3`) — XGBoost, Random Forest, Gradient Boosting with walk-forward validation
4. **Model Exploration — Time Series** (`Notebook 4`) — SARIMA, Prophet, Holt-Winters with seasonal tuning
5. **Model Exploration — Deep Learning** (`Notebook 5`) — LSTM, TCN with sliding window approach
6. **Final Model** (`Notebook 6`) — Ensemble selection, serialization, and forecast generation

### Real-Time Intelligence Sources

| Source | Provider | Refresh Rate |
|--------|---------|-------------|
| Geopolitical News | Groq LLM (web-grounded) | Every 7 days (APScheduler) |
| Live Web Search | Tavily API | On-demand (per chat query) |
| Visitor Reviews | Pre-indexed ChromaDB | At startup |
| Tourism Reports | ChromaDB (RAG) | At startup |

---

## 🔐 Security & Compliance

### Authentication

- All protected API endpoints require a valid **Firebase ID Token** passed as a Bearer token in the `Authorization` header
- Token validation is performed server-side using the **Firebase Admin SDK**
- The frontend uses **Google OAuth 2.0** via Firebase Auth for seamless single sign-on

### Firestore Security Rules

Row-level security is enforced via Firestore Rules. Users can only access their own documents:

```javascript
// Users can only read/write their own data
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
// Default deny-all for all other paths
match /{document=**} {
  allow read, write: if false;
}
```

### API Security

- **CORS** is strictly configured with an explicit allowlist of origins (no wildcard `*` in production)
- **Cross-Origin-Opener-Policy** header is set to `same-origin-allow-popups` to support Google OAuth popups
- The Docker container runs as a **non-root user** (`appuser`)
- Sensitive keys are loaded via environment variables — never hardcoded

### Secrets Management

| Secret | Storage |
|--------|---------|
| API Keys | Environment variables (`.env`, Railway Variables) |
| Firebase Service Account | `serviceAccountKey.json` (gitignored) |
| Firebase Client Config | Environment variables (prefixed `REACT_APP_`) |

> ⚠️ **Never commit `.env` files or `serviceAccountKey.json` to version control.** These are listed in `.gitignore` by default.

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run specific test modules
pytest test_router.py -v
pytest test_data_service.py -v
pytest test_chat.py -v
```

### Manual API Verification Scripts

```bash
# Verify revenue drivers output
python verify_rev_drivers.py

# Verify revenue anomaly detection
python verify_rev_anomalies.py

# Verify revenue summary
python verify_rev_summary.py

# Check APE (Absolute Percentage Error) metrics
python check_ape.py
```

### Frontend Tests

```bash
cd frontend
npm test
```

---

## 🔧 Troubleshooting

### Common Issues

#### `"Web search endpoint failed with status: 404"`
- Confirm the backend is running on `http://localhost:8000`
- Check that `REACT_APP_API_BASE_URL` in your `.env.local` points to the correct URL

#### `"API key was reported as leaked"` (Gemini)
- Your API key has been compromised and automatically revoked by Google
- Generate a new key at [Google AI Studio](https://ai.google.dev)
- Update the key in `frontend/.env.local` and `backend/.env`

#### `Chatbot not responding`
- Verify `GEMINI_API_KEY` is valid and has sufficient quota in Google AI Studio
- Check browser console for detailed error messages
- Ensure the backend is running (the chat uses server-side RAG)

#### `CORS errors in browser`
- Ensure your frontend URL is in the `allowed_origins_list` in `backend/server.py`
- In production, use the exact Firebase Hosting URL (no trailing slash)
- See `CORS_FIX_DEPLOYMENT_GUIDE.md` for detailed CORS resolution steps

#### `ChromaDB / RAG initialization fails`
- Ensure the `backend/vector database/` directory exists and has write permissions
- On first run, the RAG system will build the index (may take a few minutes)
- Check logs for `"RAG system initialized successfully"` on startup

#### `Docker container fails to start`
- Verify all required environment variables are set in Railway's dashboard
- Check Railway deployment logs for startup errors
- Confirm `serviceAccountKey.json` content is correctly passed as an environment variable (for containerized deployments, encode as base64 if needed)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes with a descriptive message: `git commit -m "feat: add geopolitical risk scoring"`
4. **Push** to your fork: `git push origin feature/your-feature-name`
5. **Open** a Pull Request against the `main` branch

### Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat:     A new feature
fix:      A bug fix
docs:     Documentation changes only
style:    Formatting, missing semicolons, etc.
refactor: Code change that neither fixes a bug nor adds a feature
perf:     Performance improvements
test:     Adding or fixing tests
chore:    Build process or auxiliary tool changes
```

### Code Standards

- **Python**: Follow PEP 8. Use type hints for all function signatures.
- **JavaScript/React**: ESLint configuration is provided. Run `npm run lint` before committing.
- **Notebooks**: Clear all cell outputs before committing Jupyter notebooks.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the Sri Lanka Tourism Authority**

*Powered by FastAPI · React · Firebase · Google Gemini · ChromaDB*

</div>
