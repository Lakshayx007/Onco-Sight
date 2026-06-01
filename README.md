# 🧬 Onco-Sight: Cancer-Wise Pipeline Intelligence

> A powerful, full-stack clinical trial intelligence platform designed to deliver deep, actionable insights into the global oncology pipeline.

**Built by Lakshay Malik.**

## 🚀 Overview

Onco-Sight is an advanced data-visualization dashboard that ingests, processes, and visualizes over 120,000+ clinical trials across 75 distinct cancer indications. By utilizing a highly optimized, cloud-native PostgreSQL architecture, the platform enables researchers, analysts, and stakeholders to dynamically filter and explore complex clinical trial landscapes in real-time.

## ✨ Key Features

- **Interactive Visualizations:** Deep-dive into trial statuses, phases, and sponsor distributions using interactive heatmaps, funnel charts, and bubble plots.
- **Dynamic Filtering Engine:** Instantly filter over 123,000 trial records by Phase, Study Type, Status, Sponsor Class, and Lines of Therapy.
- **Cloud-Native Database:** Powered by Supabase (PostgreSQL), ensuring rapid query execution with minimal memory footprint on the server.
- **Biomarker & Drug Intelligence:** Discover top co-occurring biomarkers and combination drug therapies currently leading the clinical development pipelines.
- **Premium UI/UX:** Built with React, Vite, and Tailwind CSS, featuring an elegant, responsive design with specialized dark-mode interfaces.

## 🛠️ Technology Stack

**Frontend:**
- React 18 (Vite)
- Tailwind CSS
- Recharts (Data Visualization)
- React Router

**Backend:**
- Python (FastAPI)
- SQLAlchemy & Psycopg2
- Uvicorn

**Database:**
- PostgreSQL (Hosted on Supabase)

## 📦 Deployment Architecture

The platform is designed to be easily deployed on modern cloud infrastructure:
- **Frontend:** Optimized for **Vercel** deployment (Zero-config Vite build).
- **Backend:** Configured for **Render** deployment (FastAPI).
- **Database:** **Supabase** PostgreSQL instance handling massive dataset indexing.

## ⚙️ Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- Python 3.10+

### 1. Start the Backend
Navigate to the `backend/` directory, install dependencies, and launch the FastAPI server:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 2. Start the Frontend
Navigate to the `frontend/` directory, install dependencies, and run the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser to view the application.

---
*Developed with precision and built for scale.*
