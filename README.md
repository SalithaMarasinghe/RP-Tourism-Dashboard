<div align="center">

# 🌴 Sri Lanka Tourism Intelligence Platform

**An end-to-end AI-powered analytics and decision-support system for national tourism planning — combining hybrid ensemble arrival forecasting with attraction-level visitor flow management.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase%20Hosting-orange?style=for-the-badge&logo=firebase)](https://sri-lanka-tourism-intelligence.web.app)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20on%20Railway-brightgreen?style=for-the-badge&logo=railway)](https://railway.app)
[![Python](https://img.shields.io/badge/Python-3.10-blue?style=for-the-badge&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[![ML](https://img.shields.io/badge/ML-Time%20Series%20%7C%20Ensemble%20%7C%20Deep%20Learning-purple?style=flat-square)]()
[![NLP](https://img.shields.io/badge/NLP-RAG%20%7C%20Gemini%20AI-red?style=flat-square)]()
[![VectorDB](https://img.shields.io/badge/Vector%20DB-ChromaDB-blueviolet?style=flat-square)]()
[![Database](https://img.shields.io/badge/Database-Firebase%20Firestore-orange?style=flat-square)]()
[![Deployment](https://img.shields.io/badge/Deployment-Docker%20%7C%20Railway%20%7C%20Firebase-blue?style=flat-square)]()

> **Research Paper:** *Hybrid Ensemble Forecasting and Visitor Flow Management for Tourism Intelligence in Sri Lanka* — presents the modelling methodology and empirical results underpinning this system.

</div>

---

## 📋 Table of Contents

- [Background & Problem Statement](#-background--problem-statement)
- [Research Contribution](#-research-contribution)
- [System Architecture](#-system-architecture)
- [Dataset & Data Sources](#-dataset--data-sources)
- [ML Pipeline: Arrival Forecasting](#-ml-pipeline-arrival-forecasting)
  - [Preprocessing & Feature Engineering](#preprocessing--feature-engineering)
  - [Model Exploration](#model-exploration)
  - [Final Model: Hybrid Ensemble](#final-model-hybrid-ensemble)
  - [Multi-Horizon Validation](#multi-horizon-validation)
- [ML Pipeline: Visitor Flow Distribution](#-ml-pipeline-visitor-flow-distribution)
  - [Panel Data Approach](#panel-data-approach)
  - [Model Exploration & Results](#model-exploration--results)
  - [Dynamic Visitor Load Index (VLI)](#dynamic-visitor-load-index-vli)
  - [Holiday Week Validation](#holiday-week-validation)
- [Full-Stack Application](#-full-stack-application)
  - [Platform Features](#platform-features)
  - [Technology Stack](#technology-stack)
  - [Project Structure](#project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)
- [Security & Compliance](#-security--compliance)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🏛 Background & Problem Statement

Sri Lanka's tourism industry is one of its most important economic pillars. The sector recorded **2.33 million international arrivals in 2018**, contributing over **USD 4.4 billion** in foreign exchange — roughly 5% of GDP. After the disruptions of the Easter Sunday attacks (2019), the COVID-19 pandemic, and the 2022 economic crisis, the industry demonstrated remarkable resilience, recovering to **2.05 million arrivals in 2024** and reaching a new all-time record of **2.36 million arrivals in 2025**, contributing USD 3.17 billion or more to tourism earnings.

Despite this growth, the governance and planning framework for Sri Lanka's tourism industry has remained largely stagnant:

- **National demand forecasting** still relies on outdated statistical techniques or rule-of-thumb estimates, with no production-grade system capable of incorporating macroeconomic, behavioral, and environmental signals.
- **Attraction-level visitor management** is either reactive or non-existent, with no systematic mechanism to detect congestion hotspots or proactively redistribute visitors across sites.
- The **Sri Lanka Tourism Development Authority (SLTDA)** formally recognized these gaps in its *Tourism Strategic Action Plan 2022–2025*, identifying data-driven planning and structured visitor management as strategic priorities — yet these capabilities remain largely unimplemented.

This platform directly responds to these needs by providing a unified, evidence-based framework for both national arrival forecasting and site-level flow management.

---

## 🔬 Research Contribution

This project is the implementation artifact for a peer-reviewed applied research paper. The study makes the following methodological contributions:

### Arrival Forecasting

1. **Multi-source data integration** — Demand-side and behavioral covariates (Google Trends search indices, exchange rates) are combined with environmental variables (Open-Meteo weather) and macroeconomic indicators (World Bank GDP series) into a unified input space, providing richer context than single-source approaches.

2. **Consensus-based feature selection** — Rather than relying on any single criterion, seven independent selection methods (Pearson, Spearman, Mutual Information, Lasso, Random Forest importance, permutation importance, SHAP values, and Granger causality) are aggregated into a consensus-weighted score. Only features that rank highly across multiple criteria are retained, improving both reliability and interpretability.

3. **Bayesian Optimization and Genetic Algorithm integration** — Each base learner (SVR and TsFormer) is independently fine-tuned using Bayesian Optimization with time-series-aware cross-validation. Ensemble weights are then searched via a Genetic Algorithm under a normalization constraint, minimizing validation-set RMSE. This end-to-end automated optimization is theoretically grounded in the bias-variance-diversity decomposition:
   ```
   ℒ_ensemble = noise + bias + variance − diversity
   ```

4. **Explainable AI (XAI)** — SHAP-based feature attribution is applied to the final ensemble to make model behavior transparent. Prediction-level SHAP explanations are surfaced in the Tourism Intelligence Dashboard, enabling non-technical decision-makers to inspect and trust the drivers behind individual forecast outputs.

### Visitor Flow Distribution

5. **Panel Ridge Regression for flow distribution** — Leverages multi-site cross-sectional pooling to overcome the endemic data scarcity problem at individual attraction levels in developing tourism economies.

6. **Dynamic Visitor Load Index (VLI)** — Replaces static carrying-capacity thresholds with a continuous, predicted-demand-based load index that enables proactive congestion diagnosis and redistribution planning.

---

## 🏗 System Architecture

The platform is organized into four logical layers: a shared multi-source data layer, two independent ML pipelines (arrival forecasting and flow distribution), a FastAPI backend serving all intelligence outputs, and a React frontend dashboard.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                 │
│   React 19 SPA · Recharts · Three.js · TailwindCSS                     │
│   Firebase Auth · Google OAuth 2.0                                      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS / REST
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          API LAYER (FastAPI)                             │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐    │
│  │ Forecast │  │  Flow /  │  │ Revenue  │  │  Geopolitical Tile  │    │
│  │  Router  │  │   VLI    │  │  Router  │  │  Router             │    │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐    │
│  │   Chat   │  │   RAG    │  │  Review  │  │  Auth / Source      │    │
│  │  Router  │  │  Router  │  │  Intel.  │  │  Markets / TDMS     │    │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────────┘    │
│                                                                         │
│  APScheduler → Geopolitical Pipeline (7-day refresh)                    │
└──────┬──────────────┬──────────────────┬───────────────┬───────────────┘
       │              │                  │               │
┌──────▼──┐   ┌───────▼──────┐   ┌──────▼────┐   ┌─────▼────────────────┐
│  ML /   │   │  ChromaDB    │   │ Firebase  │   │  External APIs        │
│ Forecast│   │  Vector DB   │   │ Firestore │   │  Gemini · Groq        │
│ Models  │   │  (RAG Index) │   │ + Auth    │   │  Tavily Web Search    │
└─────────┘   └──────────────┘   └───────────┘   └──────────────────────┘
```

### Data Flow: From Raw Data to Dashboard

```
Raw CSV Dataset (SLTDA, 2010–2025)
        │
        ▼
┌─────────────────────────────────┐
│  Notebook 1: Daily              │  PyMC Bayesian disaggregation
│  Disaggregation                 │  (monthly → daily, totals preserved)
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Notebook 2: Preprocessing &    │  Feature engineering, consensus-based
│  Feature Engineering            │  feature selection, VIF screening
└──────────────┬──────────────────┘
               │
       ┌───────┴──────────┐
       ▼                  ▼
┌─────────────┐    ┌───────────────────────────┐
│ Notebooks   │    │ Notebook 7: Flow           │
│ 3–6:        │    │ Distribution               │
│ Arrival     │    │ (Panel Ridge Regression    │
│ Forecasting │    │  + VLI Computation)        │
│ Pipeline    │    └────────────┬──────────────┘
└──────┬──────┘                 │
       └──────────┬─────────────┘
                  ▼
    ┌─────────────────────────────┐
    │  FastAPI Backend            │  Serves models + ChromaDB RAG
    │  (Forecast + Flow + Chat)   │  + Geopolitical tiles
    └──────────────┬──────────────┘
                   ▼
    ┌─────────────────────────────┐
    │  React Dashboard            │  Interactive KPIs, maps, charts,
    │  (Tourism Intelligence)     │  AI assistant, exportable reports
    └─────────────────────────────┘
```

---

## 🗄 Dataset & Data Sources

The ML pipelines are built on 15 years of historical data (2010–2025), combining SLTDA official statistics with a rich set of external demand drivers.

### Primary Tourism Data

| Attribute | Detail |
|-----------|--------|
| **Source** | Sri Lanka Tourism Development Authority (SLTDA) |
| **Coverage** | 2010–2025 (15 years) |
| **Granularity** | Monthly national arrivals → disaggregated to **daily** via PyMC Bayesian model |
| **Format** | CSV (raw) → processed CSV (after preprocessing) |
| **Targets** | Total international arrivals (national), daily visitor counts per attraction (site-level) |

> **Note on daily disaggregation:** Because SLTDA publishes official data at monthly granularity, a PyMC-based Bayesian model is used to generate a daily series, with monthly totals preserved as hard constraints. This daily series is treated as a constrained proxy rather than verified official daily arrivals.

### External Demand Drivers

| Source | Variables | Role |
|--------|-----------|------|
| World Bank / Macroeconomic APIs | GDP, economic health indicators | Structural demand drivers |
| Exchange Rate Series | Daily FX rates (forward-filled for weekends/gaps) | Price competitiveness |
| Google Trends | Country-level search interest indices | Behavioral / intent signals |
| Open-Meteo Weather | Daily temperature, rainfall (log-transformed) | Environmental covariates |
| Holiday & Event Calendars | Public holidays, special events | Calendar effects |
| SLTDA Visitor Management Docs | Site names, capacity bands, categories | VLI thresholds |

### Chronological Train / Validation / Test Split

| Split | Period | Purpose |
|-------|--------|---------|
| Training | 2010–2021 | Model fitting |
| Validation | 2022–2023 | Hyperparameter tuning, early stopping |
| Test | 2024–2025 | Held-out evaluation |
| External validation | SLTDA official statistics (2024, Jan–Sep 2025) | No-retraining generalization check |

---

## 🤖 ML Pipeline: Arrival Forecasting

The arrival forecasting pipeline is implemented across Notebooks 1–6 in the `ML/` directory and produces the national-level tourist arrival predictions served by the platform.

### Preprocessing & Feature Engineering

Raw preprocessing steps applied before model training:

- **Chronological sorting** and removal of duplicate date columns
- **Missing value imputation** for high-frequency covariates (exchange rates, weather) using forward-fill and interpolation
- **Crisis proxies** engineered for the COVID-19 pandemic period and the 2022 economic collapse to prevent these structural shocks from being absorbed as noise
- **Holiday encoding** via Bayesian target encoding and time-dependent holiday indicators, allowing recurrent and special events to be modelled explicitly
- **Outliers preserved** in the target series to capture real tourism demand peaks

#### Consensus-Based Feature Selection

Rather than relying on any single selection criterion, a consensus-weighted approach aggregates seven independent methods. Only features that score highly across multiple criteria are retained:

| Method | Type |
|--------|------|
| Pearson Correlation | Linear association |
| Spearman Correlation | Monotonic association |
| Mutual Information | Non-linear dependence |
| Lasso Regularization | Sparse linear selection |
| Random Forest Importance | Non-linear tree-based importance |
| Permutation Importance | Model-agnostic importance |
| SHAP Values | Shapley-based attribution |
| Granger Causality | Temporal predictive causality |

VIF (Variance Inflation Factor) screening is applied to remove multicollinear economic indicators, retaining only variables that contribute unique predictive variance.

---

### Model Exploration

A comprehensive model search was conducted across three families, with consistent preprocessing and chronological cross-validation to ensure fair comparison.

**Models Explored:**

| Family | Models |
|--------|--------|
| Time Series | ARIMAX, SARIMAX, Holt–Winters, Prophet |
| Machine Learning | Random Forest, XGBoost, CatBoost, SVR |
| Deep Learning | LSTM, BiLSTM, GRU, TsFormer |

**Full Comparison Results:**

| Model | Family | Test RMSE | Test R² | Test MAPE |
|-------|--------|-----------|---------|-----------|
| ARIMAX | Time Series | 5,474.53 | −5.13 | — |
| SARIMAX | Time Series | 4,044.02 | −2.34 | — |
| Holt–Winters | Time Series | 2,293.05 | −0.08 | — |
| Random Forest | ML | 2,018.18 | 0.167 | — |
| XGBoost | ML | 1,992.78 | 0.188 | — |
| CatBoost | ML | 2,052.43 | 0.138 | — |
| **SVR** | **ML** | **862.03** | **0.848** | **10.51%** |
| LSTM | Deep Learning | 2,222.26 | −0.126 | — |
| BiLSTM | Deep Learning | 2,339.67 | −0.248 | — |
| GRU | Deep Learning | 1,223.26 | 0.659 | — |
| **TsFormer** | **Deep Learning** | **816.57** | **0.848** | **11.14%** |

Traditional time-series models produced negative R² scores on the test set — a consequence of Sri Lanka's shock-driven, structurally unstable demand patterns (Easter attacks 2019, COVID-19, 2022 economic crisis) that violate the linearity assumption. SVR and TsFormer were the clear top performers and were selected as base learners for ensemble construction.

---

### Final Model: Hybrid Ensemble

**Step 1 — Bayesian Optimization (BO)**

Each base learner was independently fine-tuned using BO with time-series-aware cross-validation:

| Model | Validation RMSE (Before BO) | Validation RMSE (After BO) | Test R² (After BO) | Test MAPE |
|-------|-----------------------------|----------------------------|--------------------|-----------|
| SVR | 618.42 | 351.36 | 0.8612 | 10.30% |
| TsFormer | 609.82 | 249.29 | 0.8934 | 10.32% |

**Step 2 — Genetic Algorithm (GA) Weight Optimization**

GA-based weight search under a normalization constraint minimized validation-set RMSE. The optimal weights assigned TsFormer a higher weight, reflecting its stronger generalization after fine-tuning:

| Base Learner | Optimal Weight |
|--------------|---------------|
| TsFormer | 66.83% |
| SVR | 33.17% |

**Ensemble Performance vs. Individual Learners:**

| Model | Dataset | RMSE | R² | MAPE |
|-------|---------|------|----|------|
| TsFormer | Test | 683.70 | 0.8934 | 10.32% |
| SVR | Test | 796.39 | 0.8515 | 10.30% |
| **Hybrid Ensemble** | **Test** | **581.24** | **0.9230** | **9.36%** |

The hybrid ensemble outperforms both base learners on all three metrics. Statistical significance is confirmed by the **Diebold–Mariano test**:
- vs. SVR baseline: DM = 4.8524, p < 0.0001
- vs. TsFormer baseline: DM = 5.7509, p < 0.0001

**Ablation: Ensemble Weighting Strategies**

To isolate GA's contribution, five weighting schemes were compared. All ensembles outperformed individual models, confirming that the performance gain is primarily driven by the complementary inductive biases of SVR and TsFormer rather than the exact weighting strategy. GA remains the preferred method as it is fully automated and scales to larger ensembles.

| Strategy | SVR Weight | TsFormer Weight | RMSE | R² | MAPE |
|----------|-----------|----------------|------|----|------|
| Equal Weights | 0.50 | 0.50 | 586.85 | 0.9215 | 9.23% |
| Val-Error Weights | 0.41 | 0.59 | 578.70 | 0.9236 | 9.25% |
| **GA-Optimized** | **0.33** | **0.67** | **581.23** | **0.9230** | **9.36%** |

**XAI / Interpretability**

SHAP-based feature attribution was applied to the ensemble for interpretability. Lagged arrival values and rolling statistics were the dominant predictors, with exchange rates and macroeconomic indicators acting as secondary modulating factors. Prediction-level SHAP explanations are surfaced in the Tourism Intelligence Dashboard so that decision-makers can inspect the drivers behind any individual forecast output.

---

### Multi-Horizon Validation

The ensemble was evaluated at forecast horizons from 1 month to 24 months to confirm its suitability for medium- and long-term planning (beyond short-term interpolation).

| Horizon | N (days) | SVR MAPE | TsFormer MAPE | **Ensemble MAPE** | Ensemble R² |
|---------|---------|----------|--------------|-------------------|------------|
| 1 month | 21 | 5.7% | 4.2% | **2.9%** | 0.910 |
| 3 months | 62 | 8.6% | 9.2% | **7.9%** | 0.746 |
| 6 months | 91 | 7.4% | 8.5% | **7.2%** | 0.862 |
| 12 months | 183 | 9.8% | 12.5% | **10.6%** | 0.878 |
| 18 months | 183 | 12.6% | 9.8% | **9.6%** | 0.914 |
| 24 months | 274 | 11.4% | 10.6% | **9.9%** | 0.918 |

The ensemble maintains MAPE at or below 10% through 24 months, outperforming both individual learners at every horizon. Ensemble diversity adds the most value at longer planning-relevant lead times, where SVR degrades more sharply and TsFormer shows instability at intermediate horizons.

**Independent Validation Against SLTDA Official Statistics (no retraining):**

| Period | Ensemble Forecast | SLTDA Official | Annual Error |
|--------|-------------------|----------------|-------------|
| Full Year 2024 | 2.238 million | 2.050 million | **9.2%** |
| Jan–Sep 2025 | 1.817 million | 1.770 million | **2.7%** |

---

## 🗺 ML Pipeline: Visitor Flow Distribution

The visitor flow distribution pipeline (Notebook 7) operates at the attraction level, forecasting daily visitor demand per site and computing the Dynamic Visitor Load Index for congestion diagnosis and redistribution planning.

### Panel Data Approach

Individual tourist sites in Sri Lanka face severe **data scarcity** — historical visitor count records are limited, irregular, or entirely absent for many attractions. To overcome this, a **panel data** structure is adopted, pooling observations across all sites into a shared matrix indexed by `(site, date)`.

This approach:
- Enables the model to learn cross-sectional temporal patterns common across sites
- Transfers statistical signal from data-rich sites to data-scarce ones
- Eliminates the need for separate per-site models that would each individually overfit

#### Panel Feature Engineering

The flow pipeline applies the following transformations to the site-date panel matrix:

- **Lag features:** 1-day, 7-day, 30-day visitor lags per site
- **Rolling averages:** 7-day and 30-day rolling means
- **Holiday indicators:** Event flags and Bayesian target encoding of holidays; non-event dates explicitly flagged to isolate event vs. baseline demand
- **Macroeconomic interpolation:** Monthly indicators down-sampled to daily; exchange rates forward-filled for weekends
- **Rainfall log-transformation:** Reduces skew from monsoon extremes
- **VIF screening:** Retains only economic indicators that contribute unique predictive variance
- **Site encoding:** Site identities retained via label encoding; target not scaled to preserve interpretability for congestion analysis

---

### Model Exploration & Results

A full model comparison was conducted across linear, tree-based, deep learning, and hybrid families:

| Model | MAPE | Accuracy | MASE |
|-------|------|----------|------|
| **Panel Ridge Regression** | **10.74%** | **89.26%** | **0.246** |
| Panel CatBoost | 11.84% | 88.16% | 0.273 |
| Hybrid (Ridge + XGBoost) | 12.43% | 87.57% | 0.278 |
| Panel GRU | 14.78% | 85.22% | 0.327 |
| Panel LSTM | 21.37% | 78.63% | 0.493 |

Panel Ridge Regression was selected as the production flow model. Notably, deep learning models (GRU, LSTM) underperformed the linear model on this dataset — a result explained by the engineered lag and rolling features already capturing the most important temporal structure, making additional model complexity counterproductive.

**Feature Importance (Panel Ridge Regression):**

| Feature | Importance Score |
|---------|-----------------|
| 7-day lag of site visitors | 0.35 |
| Month | 0.22 |
| 1-day lag of site visitors | 0.18 |
| Other features | 0.25 |

**Ablation: Panel vs. Isolated Site Modelling**

| Modelling Strategy | Overall MAPE | MASE | Accuracy |
|--------------------|-------------|------|----------|
| **Panel Approach (multi-site)** | **10.74%** | **0.246** | **89.26%** |
| Isolated Approach (single-site) | 16.32% | 0.381 | 82.91% |

Pooling data across sites reduces MAPE by 5.58 percentage points and improves accuracy by over 6%, confirming that cross-sectional effects are critical and cannot be replicated by per-site models. Statistical significance confirmed by Diebold–Mariano test (DM = 3.612, p < 0.001).

---

### Dynamic Visitor Load Index (VLI)

The VLI translates model predictions into an operational congestion signal for each site on each day:

```
VLI = (Predicted Visitors / Site Capacity Threshold) × 100
```

Capacity thresholds are derived from SLTDA visitor management documents and are site-specific.

| VLI Range | Status | Operational Meaning |
|-----------|--------|---------------------|
| < 60% | 🟢 Under-load | Potential for increased marketing / visitor attraction |
| 60–100% | 🟡 Acceptable load | Normal operations |
| > 100% | 🔴 Congestion | Intervention required |

**Redistribution Simulation**

The platform includes a redistribution scenario tool. Transferring 10–15% of predicted visitors from congested sites (e.g. Sigiriya, Yala National Park) to nearby under-loaded alternatives (e.g. Pidurangala) moves both the source and destination sites into the operationally acceptable 80–100% VLI range, without any additional infrastructure investment.

---

### Holiday Week Validation

To validate robustness against a real-world, high-stakes scenario, the flow model was tested against the **April 2026 Sinhala and Tamil New Year holiday week** at five major tourist attractions — a period characterized by extreme localized demand surges.

| Attraction | Pre-Holiday Daily Avg | Predicted Peak | Actual (SLTDA Gate Count) | Predicted VLI | APE |
|-----------|----------------------|---------------|--------------------------|--------------|-----|
| Temple of the Tooth (Kandy) | 3,500 | 9,800 (+180%) | 10,290 | 135% | 4.76% |
| Sigiriya Rock Fortress | 3,000 | 6,900 (+130%) | 7,245 | 140% | 4.76% |
| Galle Fort | 2,200 | 5,390 (+145%) | 5,145 | 115% | 4.76% |
| Yala National Park | 1,500 | 3,000 (+100%) | 3,150 | 125% | 4.76% |
| Horton Plains | 1,000 | 2,100 (+110%) | 2,210 | 110% | 4.98% |
| **Average** | — | — | — | — | **4.8%** |

Without any post-training adjustment, the model predicted surges of up to 180% and flagged Sigiriya and Yala as congestion hotspots **three weeks in advance** — demonstrating that the holiday encoding approach translates anticipated national demand into accurate, site-level operational intelligence.

---

## 💻 Full-Stack Application

The trained models and intelligence outputs are delivered through a production-grade full-stack application: a FastAPI backend and a React 19 dashboard, deployed on Railway and Firebase Hosting respectively.

### Platform Features

| Module | Description | Key Metrics / Technology |
|--------|-------------|--------------------------|
| 🔮 **Arrival Forecasting** | Hybrid SVR–TsFormer ensemble forecasts national tourist arrivals up to 24 months ahead with interactive multi-horizon views and SHAP explanations per forecast | Test R² 0.9230, MAPE 9.36%; SVR + TsFormer, BO + GA |
| 🗺️ **Visitor Flow & VLI** | Attraction-level daily demand forecasts with a Dynamic Visitor Load Index, congestion hotspot detection, and 10–15% visitor redistribution simulation | Accuracy 89.26%, MASE 0.246; Panel Ridge Regression |
| 💰 **Revenue Analytics** | Geographic revenue distribution tracking, revenue anomaly detection, and income stream forecasting by source market | Pandas, NumPy, Recharts |
| 🎯 **Source Market Profiling** | Segments tourist arrivals by country of origin, demographics, and travel behavior for targeted marketing insights | Recharts, GeoJSON |
| 🌍 **Geopolitical Intelligence** | Monitors global events and generates weekly risk tiles with automated refresh for source market and revenue analytics | Groq LLM, APScheduler (7-day refresh) |
| ⭐ **Review Intelligence** | Sentiment analysis and aspect-based opinion mining over visitor reviews by landmark and region | ChromaDB, Gemini AI |
| 💬 **AI Strategic Assistant** | Conversational interface grounded in tourism datasets via RAG, augmented with live web search for current events | Gemini API, Tavily, ChromaDB |
| 📖 **Knowledge Retrieval (RAG)** | Hybrid BM25 + vector retrieval over tourism documents and historical data for factual, grounded AI responses | ChromaDB, rank-bm25, LangChain |
| 📊 **Interactive Dashboard** | KPI overview, real-time charts, 3D globe visualization, and PDF export of reports | Recharts, Three.js, jsPDF |
| 🔐 **Auth & Per-User Persistence** | Google OAuth 2.0 single sign-on with per-user chat history and preferences stored in Firestore | Firebase Auth, Firestore |

---

### Technology Stack

#### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| API Framework | FastAPI | ≥ 0.115.0 |
| Server | Uvicorn (ASGI) | ≥ 0.30.0 |
| Data Processing | Pandas, NumPy | 3.0.1, 2.4.x |
| Vector Database | ChromaDB | ≥ 0.5.23 |
| LLM Orchestration | LangChain + Google GenAI | ≥ 0.2.0 / ≥ 1.0.7 |
| Generative AI | Google Gemini API | ≥ 0.7.2 |
| Fast LLM Inference | Groq API | ≥ 0.4.0 |
| Web Search | Tavily Python | ≥ 0.3.3 |
| Keyword Retrieval | rank-bm25 | ≥ 0.2.2 |
| Task Scheduling | APScheduler | ≥ 3.10.0 |
| Auth Backend | Firebase Admin SDK | ≥ 6.2.0 |
| Validation | Pydantic v2 | ≥ 2.8.0 |
| Containerization | Docker (multi-stage) | Python 3.10-slim |

#### Frontend

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

#### Infrastructure

| Component | Platform |
|-----------|---------|
| Backend Hosting | Railway (Docker container) |
| Frontend Hosting | Firebase Hosting |
| Database | Google Cloud Firestore |
| Authentication | Firebase Auth (Google OAuth 2.0) |
| CI/CD (Frontend) | `npm run deploy` → Firebase CLI |
| Health Monitoring | Railway → `/healthz` |

---

### Project Structure

```
RP-Tourism-Dashboard/
│
├── ML/                                     # Machine Learning pipeline
│   ├── 0. Raw Dataset.csv                  # Raw SLTDA arrivals (2010–2025)
│   ├── 1. Preprocessing-Arrival_Disagg.ipynb  # PyMC daily disaggregation
│   ├── 1. preprocessed-dataset.csv         # Output of disaggregation
│   ├── 2. Preprocessing-Preprocessing.ipynb   # Feature engineering & selection
│   ├── 3. Model_Exploration-ML.ipynb       # Random Forest, XGBoost, CatBoost, SVR
│   ├── 4. Model_Exploration-TS.ipynb       # ARIMAX, SARIMAX, Holt-Winters, Prophet
│   ├── 5. Model_Exploration-DL.ipynb       # LSTM, BiLSTM, GRU, TsFormer
│   ├── 6. Arrival_Final_Model.ipynb        # BO + GA hybrid ensemble + SHAP XAI
│   └── 7. Flow_Distribution.ipynb          # Panel Ridge Regression + VLI
│
├── backend/                                # FastAPI application
│   ├── server.py                           # App bootstrap, middleware, router mounts
│   ├── auth.py                             # Firebase token verification
│   ├── Dockerfile                          # Multi-stage production image
│   ├── requirements.txt
│   ├── .env                                # Environment variables (NOT committed)
│   │
│   ├── routers/                            # API route handlers
│   │   ├── auth_router.py
│   │   ├── chat_router.py
│   │   ├── core_router.py
│   │   ├── forecast_router.py              # Arrival forecast endpoints
│   │   ├── geopolitical_tile.py
│   │   ├── rag_router.py
│   │   ├── rev.py                          # Revenue analytics
│   │   ├── revenue_geo.py
│   │   ├── review_intelligence.py
│   │   ├── search_router.py
│   │   ├── source_markets_router.py
│   │   ├── source_market_geo_router.py
│   │   ├── tdms_router.py
│   │   └── demo.py
│   │
│   ├── services/                           # Business logic layer
│   │   ├── tourism_rag.py                  # ChromaDB + BM25 hybrid retrieval
│   │   ├── chat_service.py                 # Gemini + RAG + web search orchestration
│   │   ├── geopolitical_service.py         # Groq LLM intelligence
│   │   ├── geopolitical_tile_scheduler.py  # APScheduler 7-day refresh
│   │   ├── forecast_service.py             # Model inference & caching
│   │   ├── source_markets_service.py
│   │   ├── source_market_geo_service.py
│   │   ├── review_intelligence_service.py
│   │   ├── rev_data_service.py
│   │   ├── rev_forecast_builder.py
│   │   ├── rev_anomaly_service.py
│   │   ├── search_service.py               # Tavily wrapper
│   │   └── auth_service.py
│   │
│   ├── models/                             # Pydantic request/response schemas
│   ├── forecasts/                          # Serialized model artifacts & CSV outputs
│   ├── prompts/                            # LLM prompt templates
│   ├── vector database/                    # ChromaDB persistent storage
│   └── cache/                              # Response cache
│
├── frontend/                               # React 19 SPA
│   ├── src/
│   │   ├── App.js                          # Root component + routing
│   │   ├── ChatbotTab.js                   # AI assistant UI
│   │   ├── firebase.js                     # Firebase SDK config
│   │   ├── api/                            # Axios API client modules
│   │   ├── components/                     # Reusable UI components
│   │   ├── context/                        # React context providers
│   │   ├── hooks/                          # Custom React hooks
│   │   ├── pages/                          # Page-level components
│   │   ├── lib/                            # Utility libraries
│   │   └── utils/                          # Helper functions
│   ├── package.json
│   ├── tailwind.config.js
│   ├── firebase.json
│   └── .env.production
│
├── firestore.rules                         # Firestore row-level security rules
├── railway.toml                            # Railway deployment config
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Python | 3.10 | [python.org](https://www.python.org/) |
| Node.js | 18.x LTS | [nodejs.org](https://nodejs.org/) |
| npm | 9+ | Bundled with Node.js |
| Git | 2.x | [git-scm.com](https://git-scm.com/) |
| Docker *(optional)* | 24.x | [docker.com](https://www.docker.com/) |

---

### Environment Variables

#### Backend — `backend/.env`

```env
# ── Google Gemini ──────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here

# ── Groq (Geopolitical Intelligence LLM) ──────────────
GROQ_API_KEY=your_groq_api_key_here

# ── Tavily (Live Web Search) ───────────────────────────
TAVILY_API_KEY=your_tavily_api_key_here

# ── Firebase Admin SDK ─────────────────────────────────
# Place serviceAccountKey.json in backend/ (gitignored)
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json

# ── Application ────────────────────────────────────────
PORT=8000
ENV=development
```

#### Frontend — `frontend/.env.local` (development) / `frontend/.env.production`

```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Config — from Firebase Console → Project Settings → Your Apps
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

> **Where to get your keys:**
> - **Gemini API Key** → [Google AI Studio](https://ai.google.dev) → Get API Key
> - **Groq API Key** → [console.groq.com](https://console.groq.com)
> - **Tavily API Key** → [app.tavily.com](https://app.tavily.com)
> - **Firebase Config** → Firebase Console → Project Settings → Your Apps
> - **Firebase Service Account** → Firebase Console → Project Settings → Service Accounts → Generate new private key

---

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/SalithaMarasinghe/RP-Tourism-Dashboard.git
cd RP-Tourism-Dashboard

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# 3. Install backend dependencies
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# 4. Configure environment variables
#    Create backend/.env from the template above
#    Place your Firebase serviceAccountKey.json in backend/

# 5. Start the development server
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

| Endpoint | URL |
|----------|-----|
| API base | `http://localhost:8000` |
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |
| Health check | `http://localhost:8000/healthz` |

---

### Frontend Setup

```bash
# From the project root
cd frontend

# Install dependencies
npm install

# Create frontend/.env.local from the template above

# Start the development server
npm start
```

The React app will be available at **`http://localhost:3000`**.

---

## 🚢 Deployment

### Backend — Railway (Docker)

The backend uses a multi-stage `Dockerfile` for a minimal production image.

```bash
# Build and test locally (optional)
cd backend
docker build -t tourism-backend:latest .
docker run -p 8000:8000 --env-file .env tourism-backend:latest
```

**Deploying to Railway:**

1. Push your code to GitHub
2. Create a new Railway project and link the repository
3. Add all environment variables in Railway's dashboard under **Variables**
4. Railway auto-detects `railway.toml` and builds from the Dockerfile

```toml
# railway.toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "exec uvicorn server:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/healthz"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

---

### Frontend — Firebase Hosting

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login and deploy
firebase login
cd frontend
npm run deploy          # runs: npm run build && npx firebase deploy
```

Production URL: **`https://sri-lanka-tourism-intelligence.web.app`**

---

## 📡 API Reference

Full interactive documentation is available at `/docs` (Swagger UI) once the backend is running. All endpoints require a valid **Firebase ID Token** as a Bearer token in the `Authorization` header, except the health check.

| Router | Base Path | Description |
|--------|-----------|-------------|
| Core | `/api/` | Health check, base data endpoints |
| Auth | `/api/auth/` | Firebase token validation, user management |
| Forecast | `/api/forecast/` | National arrival predictions (hybrid ensemble) |
| Flow / VLI | `/api/flow/` | Attraction-level flow forecasts + VLI |
| Revenue | `/api/rev/` | Revenue analytics, anomaly detection, forecasts |
| Revenue Geo | `/api/revenue-geo/` | Geographic revenue distribution |
| Geopolitical | `/api/geopolitical/` | Risk tiles, event impact analysis |
| Source Markets | `/api/source-markets/` | Arrival segmentation by origin |
| Source Market Geo | `/api/source-market-geo/` | Geographic market distribution |
| Review Intelligence | `/api/reviews/` | Sentiment & aspect analysis |
| Chat | `/api/chat/` | AI assistant (Gemini + RAG) |
| RAG | `/api/rag/` | Direct knowledge retrieval |
| Search | `/api/search/` | Tavily live web search |
| TDMS | `/api/tdms/` | Tourism data management |

**Example requests:**

```bash
# Health check (no auth required)
curl https://your-backend.railway.app/healthz

# National arrival forecast
curl https://your-backend.railway.app/api/forecast/arrivals \
  -H "Authorization: Bearer <firebase_id_token>"

# AI assistant query
curl -X POST https://your-backend.railway.app/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <firebase_id_token>" \
  -d '{"message": "What are the peak tourism months for Sri Lanka?"}'

# Revenue summary
curl https://your-backend.railway.app/api/rev/summary \
  -H "Authorization: Bearer <firebase_id_token>"
```

---

## 🔐 Security & Compliance

### Authentication

- All protected API endpoints require a valid **Firebase ID Token** passed as a Bearer token
- Token validation is performed server-side using the **Firebase Admin SDK**
- The frontend uses **Google OAuth 2.0** via Firebase Auth for single sign-on

### Firestore Security Rules

Row-level security enforced via Firestore Rules — users can only access their own documents:

```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /{document=**} {
  allow read, write: if false;   // Default deny-all
}
```

### API Security

- **CORS** is configured with an explicit origin allowlist — no wildcard `*` in production
- **Cross-Origin-Opener-Policy** header set to `same-origin-allow-popups` to support Google OAuth popups
- The Docker container runs as a **non-root user** (`appuser`)
- Sensitive keys are loaded exclusively from environment variables — never hardcoded

### Secrets Management

| Secret | Storage |
|--------|---------|
| API Keys (Gemini, Groq, Tavily) | Environment variables (`.env`, Railway Variables) |
| Firebase Service Account | `serviceAccountKey.json` (gitignored) |
| Firebase Client Config | Environment variables (prefixed `REACT_APP_`) |

> ⚠️ **Never commit `.env` files or `serviceAccountKey.json` to version control.** Both are listed in `.gitignore` by default.

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
python verify_rev_drivers.py       # Verify revenue driver output
python verify_rev_anomalies.py     # Verify anomaly detection
python verify_rev_summary.py       # Verify revenue summary
python check_ape.py                # Check APE metrics
```

### Frontend Tests

```bash
cd frontend
npm test
```

---

## 🔧 Troubleshooting

#### `"Web search endpoint failed with status: 404"`
Confirm the backend is running on `http://localhost:8000` and that `REACT_APP_API_BASE_URL` in `.env.local` points to the correct URL.

#### `"API key was reported as leaked"` (Gemini)
Your key was automatically revoked by Google. Generate a new one at [Google AI Studio](https://ai.google.dev) and update both `frontend/.env.local` and `backend/.env`.

#### `Chatbot not responding`
Verify `GEMINI_API_KEY` is valid and has sufficient quota. Check the browser console for errors and confirm the backend is running (the chat uses server-side RAG).

#### `CORS errors in browser`
Ensure your frontend URL is in the `allowed_origins_list` in `backend/server.py`. In production, use the exact Firebase Hosting URL with no trailing slash. See `CORS_FIX_DEPLOYMENT_GUIDE.md` for a detailed resolution guide.

#### `ChromaDB / RAG initialization fails`
Ensure the `backend/vector database/` directory exists and has write permissions. On first run, the RAG system builds the index — this may take a few minutes. Look for `"RAG system initialized successfully"` in the startup logs.

#### `Docker container fails to start`
Verify all required environment variables are set in Railway's dashboard and check the Railway deployment logs for startup errors. For `serviceAccountKey.json` in containerized deployments, encode the JSON as a base64 string and pass as an environment variable.

---

## 🤝 Contributing

Contributions are welcome. Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** with a descriptive message following the Conventional Commits format
4. **Push** to your fork: `git push origin feature/your-feature-name`
5. **Open** a Pull Request against `main`

### Commit Message Convention

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

- **Python:** Follow PEP 8. Use type hints for all function signatures.
- **JavaScript/React:** ESLint configuration is provided. Run `npm run lint` before committing.
- **Notebooks:** Clear all cell outputs before committing Jupyter notebooks.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built for the Sri Lanka Tourism Development Authority**

*Powered by FastAPI · React · Firebase · Google Gemini · ChromaDB*

</div>
