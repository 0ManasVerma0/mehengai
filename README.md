# 📊 Mehengai — India Inflation Monitor

> **Mehengai** (मेहंगाई) — Hindi for *inflation* or *expensiveness*

A public-facing web dashboard that aggregates, cleans, and visualises official Indian government inflation and wage data — making it understandable, accessible, and explorable for every Indian citizen.

**🔗 Live Site:** [mehengai.vercel.app](https://mehengai.vercel.app)

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black)

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [What Mehengai Shows](#-what-mehengai-shows)
- [System Architecture](#-system-architecture)
- [Data Pipeline](#-data-pipeline)
- [Data Sources](#-data-sources)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Local Development](#-local-development)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Automation](#-automation)

---

## 🔍 The Problem

India's inflation and wage data is published across multiple government websites — MOSPI, Labour Bureau, PPAC — buried in Excel spreadsheets, PDF reports, and data portals that require technical expertise to navigate.

There is no single, clean, visual platform that answers basic but critical questions:

- Is my purchasing power growing or shrinking?
- How does inflation differ across states?
- Are wages keeping up with rising prices?
- How does consumer inflation compare to wholesale inflation?

**Mehengai answers all of these.**

---

## 📈 What Mehengai Shows

| Section | What It Displays |
|---|---|
| **CPI Dashboard** | Consumer Price Index — MoM, YoY, 12-month moving average |
| **WPI Dashboard** | Wholesale Price Index trend and comparison with CPI |
| **Real Wage Growth** | WRI minus CPI — are wages beating inflation? |
| **Breakdown** | Food vs Non-Food · Rural vs Urban inflation |
| **State Heatmap** | India map coloured by state-level inflation |
| **Price Tracker** | Daily petrol & diesel prices by city |

---

## 🏗 System Architecture

The system is built as three completely independent layers that communicate only through the PostgreSQL database.

![system architecture](./assets/images/system_arch.png)

**Key design principle:** Python only writes data. Node.js only reads data. They never talk to each other — the database is the only shared layer.

---

## 🔄 Data Pipeline

### Overview

![overview](./assets/images/overview.png)

---

### Pipeline 1 — CPI & WPI Data (MOSPI Official API)

CPI (Consumer Price Index) and WPI (Wholesale Price Index) are fetched from the MOSPI official API using a registered access token.

![pipeline 1](./assets/images/pipeline1.png)

---

### Pipeline 2 — WRI Data (Excel File)

Wage Rate Index (WRI) data covering 2016–2024 was sourced from an Excel file published by the Labour Bureau and loaded into the database as a one-time historical import.

![pipeline 2](./assets/images/pipeline2.png)

---


---

### Monthly Automation Flow (n8n)

```
Every month on the 15th at 9:30 AM IST
```

---

## 📡 Data Sources

| Data | Source | Method | Frequency |
|---|---|---|---|
| CPI (Consumer Price Index) | [MOSPI Official API](https://www.mospi.gov.in/) | API (token auth) | Monthly |
| WPI (Wholesale Price Index) | [MOSPI Official API](https://www.mospi.gov.in/) | API (token auth) | Monthly |
| WRI (Wage Rate Index) | [Labour Bureau](https://labourbureau.gov.in) | Excel file (2016–2024) | Historical |

---

## 🛠 Tech Stack

### Data Pipeline (Python)
| Tool | Purpose |
|---|---|
| `requests` | HTTP requests to MOSPI API and PPAC |
| `pandas` | Data cleaning and metric calculations |
| `BeautifulSoup` | Parsing PPAC HTML tables |
| `playwright` | Fallback browser scraping for JS-rendered pages |
| `psycopg2` | PostgreSQL database connector |
| `python-dotenv` | Environment variable management |

### Backend (Node.js)
| Tool | Purpose |
|---|---|
| `express` | REST API framework |
| `pg` | PostgreSQL connection pool |
| `cors` | Cross-origin request handling |
| `helmet` | Security headers |
| `morgan` | Request logging |
| `compression` | Gzip response compression |

### Frontend (React + Vite)
| Tool | Purpose |
|---|---|
| `react` | UI framework |
| `vite` | Build tool and dev server |
| `recharts` | CPI, WPI, WRI, wage growth charts |
| `react-leaflet` | India state heatmap |
| `axios` | API calls to backend |
| `tailwindcss` | Utility-first styling |

### Infrastructure
| Service | Purpose | Cost |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL database (500MB) | Free |
| [Render](https://render.com) | Node.js backend hosting | Free |
| [Vercel](https://vercel.com) | React frontend hosting | Free |
| [n8n Cloud](https://n8n.cloud) | Monthly automation workflows | Free |
| [UptimeRobot](https://uptimerobot.com) | Keep Render server awake | Free |

**Total monthly cost: ₹0**

---

## 📁 Project Structure

```
mehengai/
│
├── scraper/                          # Python data pipeline
│   ├── api_clients/
│   │   └── mospi_client.py           # MOSPI API — CPI, WPI, WRI
│   ├── scrapers/
│   │   └── petrol_scraper.py         # PPAC petrol price scraper
│   ├── processors/
│   │   ├── clean_cpi.py              # CPI data cleaning
│   │   ├── clean_wri.py              # WRI data cleaning
│   │   └── calculate_metrics.py      # MoM, YoY, moving avg, real wage
│   ├── db/
│   │   ├── connection.py             # Supabase connection
│   │   ├── load_data.py              # Database insert functions
│   │   └── schema.sql                # Table definitions
│   ├── raw_data/                     # Downloaded files (gitignored)
│   ├── cleaned_data/                 # Processed CSVs (gitignored)
│   ├── main.py                       # Pipeline entry point
│   └── requirements.txt
│
├── backend/                          # Node.js API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── cpi.js                # GET /api/cpi/*
│   │   │   ├── wpi.js                # GET /api/wpi/*
│   │   │   ├── wri.js                # GET /api/wri/*
│   │   │   ├── wages.js              # GET /api/wages/*
│   │   │   ├── states.js             # GET /api/states/*
│   │   │   └── prices.js             # GET /api/prices/*
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   └── db.js                     # pg connection pool
│   ├── index.js                      # Express app entry point
│   └── package.json
│
└── frontend/
    └── mehengai/                     # React + Vite app
        ├── src/
        │   ├── components/
        │   │   ├── Layout/           # Navbar, Footer
        │   │   ├── Dashboard/        # MetricCard, PrimaryDashboard
        │   │   ├── Charts/           # CPI, WPI, WRI, comparison charts
        │   │   ├── HeatMap/          # India state choropleth
        │   │   └── PriceTracker/     # Petrol/diesel price trends
        │   ├── hooks/
        │   │   └── useInflationData.js  # Custom data fetching hook
        │   ├── utils/
        │   │   └── formatters.js     # Number and date formatters
        │   └── App.jsx
        ├── public/
        │   └── india_states.geojson  # India map topology
        └── package.json
```

---

## 📡 API Reference

Base URL: `https://mehengai.onrender.com`

### CPI Endpoints

```
GET /api/cpi
  Query: year, segment (combined|rural|urban), category, state, from, to
  Returns: Monthly CPI values with MoM, YoY, moving average

GET /api/cpi/latest
  Returns: Most recent General CPI value

GET /api/cpi/summary
  Returns: Latest values for all key categories

GET /api/cpi/comparison
  Returns: CPI and WPI merged by month for comparison chart

GET /api/cpi/categories
  Returns: List of all available CPI categories

GET /api/cpi/states?year=2024&month=3
  Returns: State-wise CPI for the India heatmap
```

### WPI Endpoints

```
GET /api/wpi
  Query: year, category, from, to
  Returns: Monthly WPI values

GET /api/wpi/latest
  Returns: Most recent WPI value

GET /api/wpi/categories
  Returns: All available WPI categories
```

### WRI & Wages Endpoints

```
GET /api/wri
  Query: sector, from, to
  Returns: Quarterly WRI by sector

GET /api/wri/latest
  Returns: Latest WRI per sector

GET /api/wages/real-growth
  Returns: Real wage growth trend (WRI YoY - CPI YoY)

GET /api/wages/purchasing-power
  Returns: Latest purchasing power signal (improving/declining/neutral)
```

### Price Tracker Endpoints

```
GET /api/prices/:product?city=Delhi
  product: petrol | diesel
  Returns: Daily price trend + stats (current, MoM change, YoY change)

GET /api/prices/cities/list
  Returns: All cities available in price tracker
```

### System

```
GET /health
  Returns: { status, database, time }
  Used by: UptimeRobot (every 5 mins) + n8n health monitor
```

---

## 💻 Local Development

### Prerequisites

```
Python 3.11+
Node.js 18+
Git
```

### 1. Clone the repository

```bash
git clone https://github.com/0ManasVerma0/mehengai.git
cd mehengai
```

### 2. Set up the Python scraper

```bash
cd scraper
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

Create `scraper/.env`:

```bash
MOSPI_ACCESS_TOKEN=your_mospi_token_here
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

Run the pipeline:

```bash
# First time — fetch all historical data
python main.py historical

# Every month — fetch latest data only
python main.py monthly
```

### 3. Set up the database

```
1. Create a project at supabase.com
2. Go to SQL Editor
3. Paste and run the contents of scraper/db/schema.sql
```

### 4. Set up the backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```bash
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
PORT=8000
NODE_ENV=development
```

Run the backend:

```bash
npm run dev
# API running at http://localhost:8000
# Test: http://localhost:8000/health
```

### 5. Set up the frontend

```bash
cd frontend/mehengai
npm install
```

Create `frontend/mehengai/.env`:

```bash
VITE_API_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
# Opens at http://localhost:5173
```

---

## 🔑 Environment Variables

### `scraper/.env`

| Variable | Description |
|---|---|
| `MOSPI_ACCESS_TOKEN` | Access token from MOSPI API registration |
| `DATABASE_URL` | Supabase PostgreSQL connection string |

### `backend/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `PORT` | Server port (default: 8000) |
| `NODE_ENV` | `development` or `production` |

### `frontend/mehengai/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL (must start with `VITE_`) |

> ⚠️ Never commit `.env` files. All three are listed in `.gitignore`.

---

## 🚀 Deployment

### Frontend → Vercel

```
1. Import repo at vercel.com
2. Root Directory:  frontend/mehengai
3. Framework:       Vite
4. Build Command:   npm run build
5. Output Dir:      dist
6. Env Variable:    VITE_API_URL = https://mehengai.onrender.com
```

### Backend → Render

```
1. New Web Service at render.com
2. Root Directory:  backend
3. Build Command:   npm install
4. Start Command:   node index.js
5. Env Variable:    DATABASE_URL = your Supabase connection string
                    NODE_ENV = production
```

### Keep Backend Awake (UptimeRobot)

Render free tier sleeps after 15 minutes of inactivity. UptimeRobot pings the `/health` endpoint every 5 minutes to prevent this.

```
Monitor Type:   HTTP(s)
URL:            https://mehengai.onrender.com/health
Interval:       Every 5 minutes
```

---

## ⚙️ Automation

Three n8n workflows keep the data fresh automatically:

### Workflow 1 — Monthly Data Update

Triggers on the 15th of every month at 9:30 AM IST. Runs the Python pipeline and sends a Telegram notification on success or failure.

```
Cron: 30 9 15 * *
  → Execute: python main.py monthly
  → Success: Telegram ✅ CPI & WPI updated for [Month Year]
  → Failure: Telegram ❌ Pipeline failed — check logs
```

### Workflow 2 — Backend Health Monitor

Pings the backend API every 5 minutes. Sends Telegram alert if the server is down.

```
Cron: */5 * * * *
  → HTTP GET: /health
  → If status != "ok": Telegram ❌ Backend is DOWN
```

---

## 📊 Database Schema

```sql
-- CPI index values with calculated metrics
CREATE TABLE cpi_data (
    id           SERIAL PRIMARY KEY,
    category     VARCHAR(100),     -- General, Food, Housing...
    segment      VARCHAR(50),      -- combined, rural, urban
    state        VARCHAR(100),     -- National or state name
    month        INT,              -- 1–12
    year         INT,
    value        DECIMAL(10,2),    -- Index value
    mom_change   DECIMAL(10,2),    -- Month on Month %
    yoy_change   DECIMAL(10,2),    -- Year on Year %
    moving_avg   DECIMAL(10,2),    -- 12-month moving average
    UNIQUE(category, segment, state, month, year)
);

-- Wage Rate Index by sector
CREATE TABLE wri_data (
    id                SERIAL PRIMARY KEY,
    sector            VARCHAR(100),    -- Agriculture, Industry, Services
    year              INT,
    quarter           INT,             -- 1–4
    wri_value         DECIMAL(10,2),
    real_wage_growth  DECIMAL(10,2),   -- WRI YoY - CPI YoY
    status            VARCHAR(20),     -- improving, declining, neutral
    UNIQUE(sector, year, quarter)
);

-- Daily petrol and diesel prices
CREATE TABLE price_tracker (
    id           SERIAL PRIMARY KEY,
    product      VARCHAR(100),    -- petrol, diesel
    city         VARCHAR(100),
    price        DECIMAL(10,2),   -- price in ₹
    recorded_at  DATE,
    UNIQUE(product, city, recorded_at)
);
```

---

## 📖 Glossary

| Term | Definition |
|---|---|
| **CPI** | Consumer Price Index — measures change in prices paid by consumers |
| **WPI** | Wholesale Price Index — measures change in prices at the wholesale level |
| **WRI** | Wage Rate Index — measures change in wage rates across sectors |
| **MoM** | Month on Month — % change from previous month |
| **YoY** | Year on Year — % change from same month last year |
| **Moving Average** | Average of last 12 months — smooths seasonal noise |
| **Real Wage Growth** | WRI YoY minus CPI YoY — positive means wages beating inflation |
| **MOSPI** | Ministry of Statistics and Programme Implementation |
| **PPAC** | Petroleum Planning and Analysis Cell |
| **Mehengai** | Hindi (मेहंगाई) for inflation / expensiveness |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Built with ☕ and frustration at not finding India's inflation data in one place.<br>
  <strong>Data sources:</strong> MOSPI · Labour Bureau 
</div>