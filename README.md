# FairScan — AI Bias Detection Tool

Built for Google AI Hackathon 2026. Detects bias in AI decision systems.

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/yourteam/fairscan.git
cd fairscan
```

### 2. Run the backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # add your GEMINI_API_KEY
uvicorn main:app --reload
# Backend runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 3. Run the frontend
```bash
cd frontend
npm install
# .env.local already has NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
# Frontend runs at http://localhost:3000
```

### 4. Test it
- Open http://localhost:3000
- Upload `backend/demo_adult.csv` (auto-downloads on first run)
- Select `class` as the decision column
- Click Run audit

## Team
- Member 1 — Backend, data pipeline, agents 1 + 2
- Member 2 — Gemini agents 3 + 4, PDF generation  
- Member 3 — Frontend, all screens and components

## Tech Stack
- Backend: Python, FastAPI, fairlearn, SHAP, Gemini 1.5 Pro, Cloud Run
- Frontend: Next.js 14, TypeScript, Firebase Hosting