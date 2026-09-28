# 🚀 HireFlow — Production Deployment Guide

HireFlow is production-ready and can be deployed with **zero cost (100% Free Tier)** using **Vercel + Render**, or via **Docker**.

---

## 🌟 Method 1: Vercel (Frontend) + Render (Backend) — RECOMMENDED (Free)

This is the fastest, cleanest, and most reliable method. Every time you push code to GitHub, your live app auto-updates!

### Step 1: Deploy Backend on Render (Free)
1. Go to [https://render.com](https://render.com) and sign in with your GitHub account.
2. Click **New +** ➔ **Web Service**.
3. Select your repository: `Rameshkr007/HireFlow-AI-Powered-Export`.
4. Configure the settings:
   - **Name:** `hireflow-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. Click **Advanced** ➔ **Add Environment Variables**:
   ```env
   DATABASE_URL=sqlite:///./hireflow.db
   JWT_SECRET=your-random-secret-key-32-chars
   FRONTEND_URL=*
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_key_here
   SERPAPI_KEY=8afbdfb6ed5094cc8540a6172fd8920f19783827f5b9bdb22d3892b3059beb4d
   GMAIL_MODE=demo
   ```
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://hireflow-backend.onrender.com`).
8. *(Optional)* Seed the database: Go to the **Shell** tab on Render and run:
   ```bash
   python seed.py
   ```

---

### Step 2: Deploy Frontend on Vercel (Free)
1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Import `Rameshkr007/HireFlow-AI-Powered-Export`.
4. In Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `frontend`
5. Add **Environment Variables**:
   - **Key:** `VITE_API_URL`
   - **Value:** Paste your Render backend URL (e.g., `https://hireflow-backend.onrender.com`)
6. Click **Deploy**!
7. Within 60 seconds, your site will be live at `https://hireflow-export.vercel.app`! 🎉

---

## ⚡ Method 2: Render 1-Click Blueprint (`render.yaml`)

We have pre-configured a `render.yaml` file in the root of the repo.
1. Sign in to [Render](https://render.com).
2. Click **New +** ➔ **Blueprint**.
3. Select your repository `Rameshkr007/HireFlow-AI-Powered-Export`.
4. Render will automatically detect the database, backend service, and frontend static site.
5. Click **Apply** to deploy everything simultaneously!

---

## 🐳 Method 3: Self-Hosted Docker / VPS (DigitalOcean, AWS, Linode)

If deploying to an Ubuntu VPS or cloud server with Docker installed:

```bash
# Clone the repository
git clone https://github.com/Rameshkr007/HireFlow-AI-Powered-Export.git
cd HireFlow-AI-Powered-Export

# Launch all 3 services (PostgreSQL, FastAPI Backend, React Frontend)
docker-compose up -d --build

# Run database migrations & seed demo data
docker exec -it hireflow_backend python seed.py
```

Your app will be available on:
- Frontend: `http://your-server-ip:5173`
- Backend API: `http://your-server-ip:8000`
