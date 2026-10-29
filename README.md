# AeroWind GB | UK Day-Ahead Wholesale Wind Intelligence & Procurement Platform

> **An operational decision-support and quantitative error analytics platform built for UK electricity utilities trading in the wholesale Day-Ahead power market.**

[![Live Demo](https://img.shields.io/badge/Live%20App-energy--product.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://energy-product.vercel.app/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Data Source](https://img.shields.io/badge/Data-Elexon%20BMRS%20Insights-FF6F00.svg)](https://bmrs.elexon.co.uk)

🔗 **Live Production URL:** [https://energy-product.vercel.app/](https://energy-product.vercel.app/)

---

## 1. Problem Setting & Executive Context

In Great Britain (GB), wholesale electricity utilities must procure sufficient power to meet consumer demand. Power purchase decisions on the **Day-Ahead Market (EPEX SPOT & Nord Pool)** must be finalized one day prior to delivery ($D-1$) before market gate closure (typically 11:00 or 12:00 GMT).

Because renewable wind power is weather-dependent, energy traders must rely heavily on wind generation forecasts:
1. **Under-procuring thermal power** (relying on an over-optimistic wind forecast) exposes the utility to expensive **System Buy Price (SBP) cashout imbalance penalties** in the Balancing Mechanism.
2. **Over-procuring thermal power** (due to an under-forecasted wind surge) forces the utility to dump surplus energy at distressed intraday or negative prices.

### Core Objectives Delivered
- **Actionable Day-Ahead Decision Desk**: Dynamically resolves the exact, latest wind forecast available *before* the Day-Ahead decision cutoff time ($D-1$ 11:00 GMT) for all 48 half-hourly settlement periods of Delivery Day $D$.
- **Rigorous Quantitative Error Analytics**: Evaluates 1,488 settlement periods across January 2026, computing MAE, RMSE, Mean Bias Error (MBE), WAPE, lead-time horizon degradation, and error quantile risk distributions.
- **Risk-Adjusted Net Thermal Procurement Engine**: Calculates net thermal purchase requirements ($Demand - [Forecast - RiskBuffer]$) and quantifies financial savings from avoided cashout penalties.
- **Extreme Event Explorer**: Deep dives into January 2026 high-impact events (e.g. Storm Henk, mid-month Dunkelflaute calm spells, and rapid Atlantic front ramps).

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Data Layer
        E1[Elexon BMRS FUELHH Stream<br/>Actual Wind Generation]
        E2[Elexon BMRS WINDFOR Stream<br/>Forecast Wind Generation]
        DB[(SQLite Embedded Cache<br/>elexon_jan2026.db)]
        E1 -->|Ingest Script| DB
        E2 -->|Ingest Script| DB
    end

    subgraph Python Backend [FastAPI Service]
        FS[Forecast Service<br/>Cutoff Window Resolver]
        AS[Analytics Service<br/>MAE, RMSE, MBE, Quantiles]
        PS[Procurement Service<br/>Net Thermal Gap & Risk Buffer]
        API[FastAPI REST API /api]
        DB --> FS & AS & PS
        FS & AS & PS --> API
    end

    subgraph Frontend [React + Vite + TypeScript]
        UI1[Day-Ahead Decision Desk]
        UI2[Accuracy Analytics View]
        UI3[Thermal Procurement Simulator]
        UI4[Event Explorer]
        API -->|JSON REST| UI1 & UI2 & UI3 & UI4
    end
```

---

## 3. Directory & File Structure

```
.
├── Dockerfile                   # Multi-stage production container (Node build + Python runtime)
├── docker-compose.yml           # Single-command startup (`docker compose up --build`)
├── Procfile                     # Heroku / Render deployment configuration
├── vercel.json                  # Vercel serverless deployment routing
├── requirements.txt             # Root Python dependencies
├── .dockerignore                # Container build exclusions
├── .gitignore                   # Git version control ignore rules
├── README.md                    # Project documentation & reference
│
├── api/                         # Vercel Serverless entry point
│   └── index.py                 # ASGI gateway to FastAPI backend
│
├── backend/                     # Python 3.12 Backend Service
│   ├── main.py                  # FastAPI application routes, CORS & static file mounting
│   ├── database.py              # SQLite connection & health check utilities
│   ├── ingest_elexon.py         # Automated Elexon BMRS stream ingestion pipeline
│   ├── requirements.txt         # Backend Python packages (FastAPI, Uvicorn, Pydantic, etc.)
│   ├── data/
│   │   └── elexon_jan2026.db    # Bundled SQLite database (1,633 actuals, 19,856 forecasts)
│   ├── services/
│   │   ├── forecast_service.py  # Day-Ahead cutoff resolution & evolution logic
│   │   ├── analytics_service.py # MAE, RMSE, MBE, WAPE, horizons, diurnal profiles, quantiles
│   │   └── procurement_service.py # Net thermal procurement & risk buffer financial model
│   └── tests/
│       └── test_api.py          # Complete pytest suite (8 integration tests, 100% pass)
│
└── frontend/                    # Modern React 18 + TypeScript + Vite Single Page Application
    ├── package.json             # NPM dependencies (React, Recharts, Lucide, Tailwind)
    ├── vite.config.ts           # Vite bundler configuration with backend proxy
    ├── tailwind.config.js       # Dark-mode terminal theme palette (cyan/slate/emerald)
    ├── postcss.config.js        # PostCSS configuration
    ├── tsconfig.json            # TypeScript compiler configuration
    ├── index.html               # Application HTML template
    └── src/
        ├── main.tsx             # React entry point
        ├── App.tsx              # Primary state orchestrator & navigation
        ├── api.ts               # Typed REST API client
        ├── types.ts             # TypeScript interfaces for API payloads
        ├── index.css            # Tailwind directives & Bloomberg-style custom scrollbars
        └── components/
            ├── Navbar.tsx       # Date picker, D-1 cutoff selector, tab switcher
            ├── KPICard.tsx      # Polished KPI metric card component
            ├── DayAheadDesk.tsx # Operational day-ahead trading chart & 48 SP audit table
            ├── AnalyticsView.tsx# Horizon degradation, diurnal profiles, error histogram & heatmap
            ├── ProcurementSimulator.tsx # Net thermal buy calculator & cashout savings model
            └── EventExplorer.tsx# January 2026 case studies (Storm Henk, Dunkelflaute, Isha)
```

---

## 4. Key Quantitative Metrics & Mathematical Formulation

### 4.1 Error Formulas
For each half-hourly Settlement Period $i \in [1, N]$:
- **Forecast Error**:
  $$e_i = F_i - A_i$$
  *(Where $F_i$ is latest forecast published $\le$ Cutoff time on $D-1$, and $A_i$ is FUELHH actual wind generation)*
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |F_i - A_i|$$
- **Root Mean Squared Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (F_i - A_i)^2}$$
- **Mean Bias Error (MBE)**:
  $$\text{MBE} = \frac{1}{N} \sum_{i=1}^N (F_i - A_i)$$
  *Positive MBE indicates systematic over-forecasting (risk of short position).*
- **Weighted Absolute Percentage Error (WAPE)**:
  $$\text{WAPE} = \frac{\sum_{i=1}^N |F_i - A_i|}{\sum_{i=1}^N A_i} \times 100\%$$

### 4.2 January 2026 Baseline Findings (UK National Wind)
| Metric | Value | Interpretation |
| :--- | :--- | :--- |
| **Total Evaluated Periods** | 1,488 (100% of Jan 2026) | All 31 delivery days covered |
| **Fleet Mean Actual Generation** | 11,581 MW | Peak observed wind: 17,805 MW |
| **Day-Ahead MAE (D-1 11:00)** | 2,126.1 MW | ~9.6% of GB total wind fleet capacity |
| **Day-Ahead RMSE** | 2,620.8 MW | Reflects wind ramp volatility |
| **Mean Bias Error (MBE)** | +1,840.2 MW | Models showed persistent positive bias during winter |
| **P90 Wind Shortfall Buffer** | +4,363 MW | Recommended national contingency buffer |
| **Horizon Degradation** | 1,767 MW (0-6h) $\rightarrow$ 2,371 MW (48-72h) | Accuracy improves by ~35% moving into intraday |

### 4.3 Risk-Adjusted Net Thermal Procurement
$$Thermal_{\text{recommended}}(t) = \max\Big(0, \ Demand(t) - \max\big(0, \ WindForecast(t) - Buffer_{\text{confidence}}\big)\Big)$$

---

## 5. How to Start the Application

### Option A: Using Docker (Recommended, 1 Command)
Ensure Docker is running, then in the project root execute:
```bash
docker compose up --build
```
Open your browser at **`http://localhost:8000`**. The application is pre-bundled with the complete January 2026 database and compiled React frontend.

---

### Option B: Local Development Setup

#### 1. Backend (Python 3.12)
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run pytest unit tests
PYTHONPATH=. pytest backend/tests/test_api.py -v

# Start FastAPI backend (port 8000)
uvicorn backend.main:app --reload --port 8000
```

#### 2. Frontend (React + Vite)
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at **`http://localhost:3000`** (Vite proxies API calls to `localhost:8000`).

---

## 6. Deployment Guide

### Vercel Deployment (Live Production)
- **Live URL:** [https://energy-product.vercel.app/](https://energy-product.vercel.app/)
- **Configuration:** Handled via root `vercel.json` and `api/index.py` serverless runtime.
- **Build Command:** `cd frontend && npm install && npm run build`
- **Output Directory:** `frontend/dist`

### Heroku Deployment
The repository includes a `Procfile`:
```bash
heroku create <anonymous-app-name>
git push heroku main
heroku open
```

---

## 7. AI Tools Disclosure

As required by the assignment guidelines, AI tools (Google Gemini 3.8 / Antigravity pair programming assistant) were utilized during the development of this project for:
- Accelerated scaffolding of data ingestion routines for Elexon BMRS OpenAPI streaming endpoints.
- Verification of statistical error formulations (WAPE, RMSE, quantile interpolations).
- UI component styling and responsive layout optimization with Tailwind CSS.
- Drafting test cases and structural documentation.

All domain logic, SQL window functions, statistical models, and application code were thoroughly reviewed, debugged, and verified against official Elexon market documentation.
