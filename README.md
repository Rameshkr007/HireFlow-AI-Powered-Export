# HireFlow — AI-Powered Export Buyer Discovery & Outreach Automation Platform

[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)

## Overview

HireFlow is a full-stack B2B SaaS platform designed for export businesses to:
- **Discover** international buyers using AI-generated search queries
- **Organize** buyer leads with validation and deduplication
- **Classify** prospects using AI (Gemini/OpenAI)
- **Campaign** personalized outreach emails via Gmail
- **Track** all email activity and campaign results
- **Report** on campaign performance

## Business Workflow

```
Product → Buyer Discovery → Lead Collection → Data Cleaning → Validation
       → AI Classification → Campaign Creation → Personalized Email
       → Gmail Sending → Tracking → Reporting
```

## Features

| Module | Features |
|--------|---------|
| Authentication | Register, Login, JWT, Protected routes |
| Exporter Profile | Company info, sender details |
| Buyer Discovery | AI-generated search queries, modular adapters |
| Buyer Management | CRUD, CSV import/export, filters, pagination |
| Email Validation | Syntax, disposable domain detection |
| Duplicate Prevention | Normalized email/company deduplication |
| AI Classification | Gemini/OpenAI lead scoring and classification |
| Campaign Management | Create, start, pause, resume, stop |
| Email Personalization | AI-powered template customization |
| Gmail Integration | OAuth 2.0, real sending |
| Demo Mode | Full simulation without real emails |
| Reporting | Campaign summary, CSV export, charts |

## Tech Stack

**Frontend:** React 18 · Vite · TypeScript · Tailwind CSS · React Router · Axios · Recharts · Lucide React · TanStack Query

**Backend:** Python 3.11 · FastAPI · SQLAlchemy · PostgreSQL/SQLite · Pydantic · JWT · bcrypt

**AI:** Google Gemini 1.5 Flash · OpenAI GPT-4o-mini (configurable)

**Email:** Gmail API · Google OAuth 2.0

**Data:** Pandas · CSV import/export

## Project Structure

```
HireFlow/
├── frontend/                 # React + Vite + TypeScript
│   └── src/
│       ├── pages/           # All page components
│       ├── components/      # Reusable UI components
│       ├── contexts/        # Auth & Toast contexts
│       └── lib/             # API client, types
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/             # Route handlers
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helpers
│   │   └── workers/         # Background tasks
│   ├── tests/               # pytest tests
│   ├── seed.py              # Demo data seeder
│   └── requirements.txt
├── data/                     # Sample CSV files
├── attachments/              # Uploaded files storage
├── .env.example
└── README.md
```

## Database Schema

```
User              → ExporterProfile (1:1)
User              → Buyer[] (1:N)
User              → Campaign[] (1:N)
User              → GmailConnection (1:1)
Campaign          → EmailLog[] (1:N)
Buyer             → EmailLog[] (1:N)
Campaign          → Attachment (N:1)
```

## Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) PostgreSQL

### 1. Clone & Setup Environment

```bash
git clone <repo>
cd HireFlow

# Copy and configure environment
cp .env.example backend/.env
# Edit backend/.env with your values
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed demo data (creates SQLite database + 25 buyers)
python seed.py

# Start backend server
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

### 4. Demo Login

```
Email: admin@hireflow.com
Password: admin123
```

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite or PostgreSQL | `sqlite:///./hireflow.db` |
| `JWT_SECRET` | Token signing secret | `change-in-production` |
| `AI_PROVIDER` | `gemini` or `openai` | `gemini` |
| `GEMINI_API_KEY` | Google AI API key | — |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `GMAIL_MODE` | `demo` or `real` | `demo` |
| `GOOGLE_CLIENT_ID` | Gmail OAuth Client ID | — |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth Secret | — |

## Demo Mode vs Real Mode

### Demo Mode (Default)
```
GMAIL_MODE=demo
```
- No real emails are sent
- Campaign simulation: ~85% SENT, 10% FAILED, 5% SKIPPED
- Full workflow works without Gmail credentials
- Clearly labeled "DEMO MODE" in the UI

### Real Gmail Mode
```
GMAIL_MODE=real
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```
1. Create a Google Cloud project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:8000/api/gmail/callback`
5. Go to Gmail Integration page → Connect Gmail

## AI Configuration

### Gemini (Recommended)
```
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key
```
Get key at: https://aistudio.google.com

### OpenAI
```
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**Without API keys:** System uses mock classification (random scores) so the full workflow still demonstrates correctly.

## API Documentation

FastAPI Swagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc

Key endpoints:
```
POST /api/auth/register          Register
POST /api/auth/login             Login
GET  /api/auth/me                Current user

GET  /api/buyers                 List buyers (with filters)
POST /api/buyers                 Create buyer
POST /api/buyers/import          CSV import
GET  /api/buyers/export          CSV export
POST /api/buyers/{id}/validate   Validate email
POST /api/buyers/{id}/classify   AI classify

POST /api/discovery/queries      Generate search queries

GET  /api/campaigns              List campaigns
POST /api/campaigns              Create campaign
POST /api/campaigns/{id}/start   Start campaign
POST /api/campaigns/{id}/pause   Pause campaign
POST /api/campaigns/{id}/resume  Resume campaign
POST /api/campaigns/{id}/stop    Stop campaign

GET  /api/email-activity         Email activity log
GET  /api/reports/{id}           Campaign report
GET  /api/dashboard/stats        Dashboard KPIs
GET  /api/dashboard/charts       Dashboard charts
```

## CSV Import Format

```csv
buyer_name,company_name,email,website,country,source_platform,business_type,page_url,product
John Smith,ABC Imports,john@abc.com,https://abc.com,USA,LinkedIn,Importer,,Singing Bowls
```

## Running Tests

```bash
cd backend
pytest tests/ -v
```

## Security

- Passwords hashed with bcrypt
- JWT tokens with expiry
- No passwords stored for Gmail (OAuth only)
- All secrets in `.env` (never committed)
- CORS configured for frontend URL only
- Input validation via Pydantic
- File type and size validation

## Campaign Workflow

```
1. Create campaign → status: DRAFT
2. Configure email template + sending limits
3. Click "Start Campaign" → status: RUNNING
4. System loads eligible buyers (by country/audience/email status)
5. Per buyer: validate → check duplicate → personalize → send/simulate
6. Logs every result: SENT / FAILED / SKIPPED / ALREADY_CONTACTED
7. Campaign completes → status: COMPLETED
8. View campaign report and export CSV
```

## Duplicate Prevention

- Email normalized to lowercase before storage
- Unique constraint: (user_id, normalized_email)
- Before any campaign send: checks EmailLog for existing SENT record
- If previously contacted: status = ALREADY_CONTACTED (never re-sends)

## Future Improvements

- Real-time campaign progress via WebSockets
- Apollo.io / Hunter.io API integration for buyer discovery
- LinkedIn scraping via official API
- Multi-user teams / roles
- Webhook tracking (opens, clicks)
- Email A/B testing
- Automated follow-up sequences
- PDF report generation
- White-label support
