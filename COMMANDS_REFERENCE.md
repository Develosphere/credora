# 🚀 Credora - Quick Commands Reference

**Important**: Do NOT use `uv run` commands. The `uv` command is not in your PATH.

---

## ✅ Correct Commands to Use

### Start Backend API Server
```bash
.venv\Scripts\python.exe start_api.py
```
**URL**: http://localhost:8000

### Start Frontend Server
```bash
cd credora-frontend
npm run dev
```
**URL**: http://localhost:3000

---

## 🔧 Maintenance Commands

### Build FAISS Vector Index
```bash
.venv\Scripts\python.exe build_faiss_index.py
```

### Run Database Migrations
```bash
.venv\Scripts\python.exe run_migration.py
```

### Install Playwright Chromium
```bash
.venv\Scripts\python.exe -m playwright install chromium
```

---

## 🧪 Testing Commands

### Check Backend Health
```bash
curl http://localhost:8000/health
```

### Test API Endpoint
```bash
curl http://localhost:8000/docs
```

### Check Python Version
```bash
.venv\Scripts\python.exe --version
```

### List Installed Packages
```bash
.venv\Scripts\python.exe -m pip list
```

---

## 📦 Dependency Management

### Install New Python Package
```bash
.venv\Scripts\python.exe -m pip install <package-name>
```

### Install New npm Package (Frontend)
```bash
cd credora-frontend
npm install <package-name>
```

### Update Dependencies
```bash
# Python (if uv is in PATH)
uv sync

# Or use pip
.venv\Scripts\python.exe -m pip install -r requirements.txt

# Frontend
cd credora-frontend
npm update
```

---

## 🛑 Stop Services

### Stop Backend
Press `Ctrl+C` in the terminal running the backend

### Stop Frontend
Press `Ctrl+C` in the terminal running the frontend

---

## 🔍 Debugging Commands

### Check Running Processes
```bash
# Windows
tasklist | findstr python
tasklist | findstr node

# Or check ports
netstat -ano | findstr :8000
netstat -ano | findstr :3000
```

### View Backend Logs
Check the terminal where backend is running

### View Frontend Logs
Check the terminal where frontend is running

### Check Browser Console
Press `F12` in browser → Console tab

---

## 📁 File Locations

### Python Virtual Environment
```
.venv\Scripts\python.exe
```

### Backend Code
```
credora/
├── agents/          # AI agents
├── api_server.py    # Main API server
├── config.py        # Configuration
└── tools/           # Agent tools
```

### Frontend Code
```
credora-frontend/
├── src/
│   ├── app/         # Next.js pages
│   ├── components/  # React components
│   └── lib/         # Utilities
```

### Configuration Files
```
.env                 # Backend environment variables
credora-frontend/.env.local  # Frontend environment variables
```

---

## ⚠️ Common Issues

### Issue: `uv: command not found`
**Solution**: Use `.venv\Scripts\python.exe` instead of `uv run python`

### Issue: Port already in use
**Solution**: 
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue: Module not found
**Solution**:
```bash
# Reinstall dependencies
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Issue: Frontend won't start
**Solution**:
```bash
cd credora-frontend
rm -rf node_modules
npm install
npm run dev
```

---

## 🎯 Quick Start (After Restart)

1. **Start Backend**:
   ```bash
   .venv\Scripts\python.exe start_api.py
   ```

2. **Start Frontend** (new terminal):
   ```bash
   cd credora-frontend
   npm run dev
   ```

3. **Open Browser**:
   ```
   http://localhost:3000
   ```

---

## 📞 URLs Reference

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main application |
| Backend API | http://localhost:8000 | API server |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Health Check | http://localhost:8000/health | Server status |

---

## 💡 Pro Tips

1. **Always use `.venv\Scripts\python.exe`** - Don't rely on `uv` or system Python
2. **Keep two terminals open** - One for backend, one for frontend
3. **Check logs first** - Most issues show up in terminal logs
4. **Use API docs** - http://localhost:8000/docs for testing endpoints
5. **Browser DevTools** - Press F12 to debug frontend issues

---

**Last Updated**: February 17, 2026
