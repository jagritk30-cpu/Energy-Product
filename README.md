# AeroWind GB | UK Day-Ahead Wholesale Wind Intelligence & Procurement Platform

> **An operational decision-support and quantitative error analytics platform built for UK electricity utilities trading in the wholesale Day-Ahead power market.**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Data Source](https://img.shields.io/badge/Data-Elexon%20BMRS%20Insights-FF6F00.svg)](https://bmrs.elexon.co.uk)

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
├── README.md                    # Project documentation & presentation guide
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

### Vercel Deployment
The repository includes `vercel.json` and `api/index.py`:
1. Authenticate Vercel CLI: `vercel login`
2. Deploy to production:
   ```bash
   vercel --prod
   ```
3. Live URL will be output by Vercel.

### Heroku Deployment
The repository includes a `Procfile`:
```bash
heroku create <anonymous-app-name>
git push heroku main
heroku open
```

---

## 7. Video Demo Presentation Guide (10-Minute Script)

> **Structure**: 2 parts, strictly under 10 minutes total (Part 1 $\le 5$ min, Part 2 $\le 5$ min).

### Part 1: Client Pitch (Max 5 Minutes)
- **Target Audience**: Energy Utility Wholesale Trading Desk Lead & Power Portfolio Managers.
- **Goal**: Demonstrate how this tool directly solves their daily challenge: knowing how much thermal power to buy on Day-Ahead auctions without suffering cashout imbalance penalties.
- **Talking Points**:
  1. *The Challenge (0:00 - 1:00)*:
     "Every morning before 11:00 GMT, your trading desk must commit millions of pounds on the day-ahead auction. If you over-rely on an optimistic wind forecast, you're short and get penalized at high System Buy Prices in the Balancing Mechanism. If you over-buy thermal, you spill renewable energy."
  2. *The Decision Desk in Action (1:00 - 2:30)*:
     "Show the **Day-Ahead Decision Desk**. Select Delivery Date (e.g. Jan 15). Demonstrate how the platform strictly enforces the $D-1$ 11:00 GMT gate cutoff. The cyan line shows the exact actionable forecast your traders had on their screen; the emerald line shows what the wind actually delivered. Notice how the red shortfall bars highlight hours where wind fell short."
  3. *Thermal Procurement Simulator (2:30 - 4:00)*:
     "Switch to the **Thermal Procurement Gap** tab. Toggle from National Scale to Utility Portfolio Scale. Show the Risk Tolerance slider: at 50% deterministic, you leave yourself exposed. But toggle to **90% Confidence**: the platform applies a quantified risk buffer based on real historical forecast error. Point to the ROI card: *£787k in avoided cashout penalties* with 100% shortfall risk mitigation."
  4. *Client Takeaway (4:00 - 5:00)*:
     "This tool transforms raw meteorological data into actionable wholesale purchase orders. It protects your bottom line and automates your day-ahead bidding strategy."

---

### Part 2: Tech Lead Review & Architecture (Max 5 Minutes)
- **Target Audience**: Internal Technical Lead & Software Architects.
- **Goal**: Walk through the software architecture, engineering standards, data pipelines, error analytics, and code structure.
- **Talking Points**:
  1. *Architecture Overview (5:00 - 6:00)*:
     "Walk through the system diagram. Backend is Python 3.12 with FastAPI for asynchronous performance and typed Pydantic models. Frontend is React 18 with TypeScript, Vite, Tailwind CSS, and Recharts. Containerized via a multi-stage Dockerfile."
  2. *Data Pipeline & Domain Logic (6:00 - 7:30)*:
     "Show `backend/ingest_elexon.py`. We stream directly from Elexon BMRS `FUELHH` (filtering `fuelType == 'WIND'`) and `WINDFOR`. We ingested all 1,488 settlement periods of January 2026 into SQLite. Note how we handle the resolution gap: FUELHH is half-hourly (30 min) while WINDFOR is hourly (60 min). Our query logic in `forecast_service.py` uses SQL window functions (`ROW_NUMBER() OVER PARTITION BY start_time ORDER BY publish_time DESC`) to guarantee zero future-data leakage."
  3. *Quantitative Analytics Implementation (7:30 - 8:45)*:
     "Highlight `analytics_service.py`. We compute MAE, RMSE, MBE, and WAPE across the entire month. Show the lead-time degradation chart: error increases monotonically from 1,767 MW (0-6h) up to 2,371 MW (48-72h). Show the error distribution histogram and shortfall probability percentiles ($P_{50}, P_{90}, P_{95}$)."
  4. *Testing, Docker & Deployment (8:45 - 10:00)*:
     "Show `backend/tests/test_api.py`: 8 comprehensive integration tests passing in < 0.5s. Multi-stage Dockerfile compiles React into static assets and serves them directly through FastAPI in production, or as separate dev containers. Ready for 1-click Vercel/Heroku deployment."

---

## 8. AI Tools Disclosure

As required by the assignment guidelines, AI tools (Google Gemini 3.8 / Antigravity pair programming assistant) were utilized during the development of this project for:
- Accelerated scaffolding of data ingestion routines for Elexon BMRS OpenAPI streaming endpoints.
- Verification of statistical error formulations (WAPE, RMSE, quantile interpolations).
- UI component styling and responsive layout optimization with Tailwind CSS.
- Drafting test cases and presentation walkthrough scripts.

All domain logic, SQL window functions, statistical models, and application code were thoroughly reviewed, debugged, and verified against official Elexon market documentation.
