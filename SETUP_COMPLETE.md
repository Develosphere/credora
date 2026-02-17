# Credora Project Setup Complete! ✅

## What Has Been Done

### 1. Python Environment ✅
- Created virtual environment at `.venv`
- Installed all 191 Python dependencies using `uv sync`
- Dependencies include: FastAPI, LangChain, FAISS, Streamlit, PyTorch, and more

### 2. Frontend Setup ✅
- Installed 555 npm packages for Next.js frontend
- All React, Next.js, and UI dependencies are ready

### 3. Environment Configuration ✅
- Created `.env` file from `.env.example`
- Pre-configured with API keys and database credentials

## Next Steps to Run the Project

### 1. Activate Virtual Environment
```bash
# On Windows PowerShell
.venv\Scripts\Activate.ps1

# On Windows CMD
.venv\Scripts\activate.bat
```

### 2. Run Database Migrations
```bash
python -m uv run python run_migration.py
```

### 3. Build FAISS Index (Optional but Recommended)
```bash
python -m uv run python build_faiss_index.py
```
This creates the vector database for RAG functionality (takes 2-3 minutes).

### 4. Start the Backend API Server
```bash
python -m uv run python start_api.py
```
Server will run on: http://localhost:8000

### 5. Start the Frontend (New Terminal)
```bash
cd credora-frontend
npm run dev
```
Frontend will run on: http://localhost:3000

### 6. Start Java FP&A Engine (Optional - New Terminal)
```bash
cd credora-engine
mvn spring-boot:run
```
Engine will run on: http://localhost:8081

## Quick Commands Reference

### Backend
- Start API: `python -m uv run python start_api.py`
- Run migrations: `python -m uv run python run_migration.py`
- Build FAISS: `python -m uv run python build_faiss_index.py`

### Frontend
- Start dev server: `npm run dev` (in credora-frontend folder)
- Build: `npm run build`
- Start production: `npm start`

### Java Engine
- Run: `mvn spring-boot:run` (in credora-engine folder)
- Build: `mvn clean package`

## Project Structure

```
credora/
├── .venv/                      # Python virtual environment
├── credora/                    # Python backend
│   ├── agents/                 # AI agents
│   ├── tools/                  # Agent tools
│   ├── database/               # Database & migrations
│   └── api_server.py          # FastAPI server
├── credora-frontend/           # Next.js frontend
│   ├── node_modules/          # npm packages
│   └── src/                   # React components
├── credora-engine/             # Java FP&A engine
├── .env                        # Environment variables
└── pyproject.toml             # Python dependencies
```

## Troubleshooting

### PowerShell Script Execution Error
If you get "scripts is disabled" error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use
- Backend (8000): Change `OAUTH_SERVER_PORT` in `.env`
- Frontend (3000): Use `npm run dev -- -p 3001`
- Java (8081): Change port in `application.properties`

### Database Connection Issues
- Verify `DATABASE_URL` in `.env`
- Check if Supabase database is accessible
- Run migrations: `python -m uv run python run_migration.py`

## Features Available

✅ AI CFO Chat Agent with multi-agent orchestration
✅ RAG-based data retrieval with FAISS
✅ Platform integrations (Shopify, Google Ads, Meta Ads)
✅ Financial analysis engine (P&L, forecasting, SKU analysis)
✅ Voice-controlled AI CFO ("Hey Credora")
✅ Modern dark theme UI with glassmorphism
✅ Real-time chat with streaming responses

## Important Notes

1. **API Keys**: The `.env` file contains pre-configured API keys. For production, generate your own.

2. **Database**: Using Supabase PostgreSQL. Connection string is in `.env`.

3. **Mock Data**: The system uses mock data by default. Connect real platforms for live data.

4. **Java Engine**: Optional. Core features work without it.

5. **Voice Features**: Work best in Chrome/Edge browsers.

## Support

For issues, refer to:
- Main README: `README.md`
- Quick Start Guide: `QUICK_START.md`
- Updates Log: `UPDATES.md`

---

**Setup completed successfully! You're ready to start the application.** 🚀
