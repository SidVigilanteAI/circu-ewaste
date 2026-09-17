# 🚀 CircuScan Production Deployment Guide

This guide details how to deploy **CircuScan** so anyone with your deployment link can access and use the application.

---

## 🔑 Environment Variable Requirements

CircuScan relies on **Google Gemini AI** for multimodal hardware vision analysis, OCR text extraction, dynamic diagnostic questions, and 4R decision evaluations.

- **`GEMINI_API_KEY`** (Required): Your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 🌟 Option A: Unified Single-Container Deployment (Recommended)

This method packages both the **Next.js Frontend** and **Python FastAPI Backend** into a single Docker container. You only deploy **ONE service**, avoiding CORS errors and extra hosting fees.

### Deploying on Render (Free Web Service)

1. **Push your code to GitHub / GitLab**.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your repository (`circu-ewaste`).
4. Select **Docker** as the Runtime environment.
5. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: `your_actual_gemini_api_key_here`
6. Click **Create Web Service**.
7. Once deployed, Render will provide a public URL (e.g., `https://circu-ewaste.onrender.com`).
8. Anyone with this link can use the full application!

---

## 🌐 Option B: Decoupled Deployment (Vercel + Render)

If you prefer hosting the Next.js frontend on **Vercel** and the Python backend on **Render**:

### Step 1: Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) -> **New Web Service**.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variable:
   - `GEMINI_API_KEY`: `your_gemini_api_key_here`
5. Note your backend URL (e.g. `https://circuscan-backend.onrender.com`).

### Step 2: Deploy Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) -> **Add New Project**.
2. Select the `frontend/` directory (or set Root Directory to `frontend`).
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_BASE`: `https://circuscan-backend.onrender.com`
4. Click **Deploy**.
5. Your public Vercel URL (e.g. `https://circu-ewaste.vercel.app`) is live!

---

## 🐳 Option C: Local / VPS Container Deployment (Docker & Docker Compose)

To run the production build locally or on any Virtual Private Server (AWS EC2, DigitalOcean, Linode):

1. Clone the repository and set your API key in `.env`:
   ```bash
   cp .env.example .env
   # Edit .env and set GEMINI_API_KEY=your_key
   ```

2. Build and start the container:
   ```bash
   docker compose up --build -d
   ```

3. Open `http://localhost:8000` in your browser.

---

## 🧪 Verifying Your Deployment

Once deployed, verify the system health by visiting:
- **Health Check Endpoint**: `https://your-deployment-url.com/health` (should return `{"status": "ok", ...}`)
- **Interactive API Docs**: `https://your-deployment-url.com/docs` (FastAPI Swagger UI)
- **Frontend Interface**: `https://your-deployment-url.com/`

---

## 📋 Summary of Files Added for Deployment

| File | Purpose |
| :--- | :--- |
| [`Dockerfile`](file:///d:/Hackathons/PCCOE/circu-ewaste/Dockerfile) | Multi-stage Docker build for Next.js static export + FastAPI |
| [`docker-compose.yml`](file:///d:/Hackathons/PCCOE/circu-ewaste/docker-compose.yml) | One-command container launcher |
| [`render.yaml`](file:///d:/Hackathons/PCCOE/circu-ewaste/render.yaml) | Render Infrastructure-as-Code blueprint |
| [`.env.example`](file:///d:/Hackathons/PCCOE/circu-ewaste/.env.example) | Root environment variable template |
| [`frontend/.env.example`](file:///d:/Hackathons/PCCOE/circu-ewaste/frontend/.env.example) | Frontend environment variable template |
