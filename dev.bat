@echo off
setlocal
set "ROOT=%~dp0"

if not exist "%ROOT%backend\.env" (
  copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
  echo Created backend\.env from .env.example. Add your keys before chatting.
)

if not exist "%ROOT%frontend\.env" (
  copy "%ROOT%frontend\.env.example" "%ROOT%frontend\.env" >nul
  echo Created frontend\.env from .env.example.
)

start "Nexus Backend" cmd /k "cd /d "%ROOT%backend" && (if not exist .venv python -m venv .venv) && call .venv\Scripts\activate && pip install -q -r requirements.txt && uvicorn app.main:app --reload --port 8000"
start "Nexus Frontend" cmd /k "cd /d "%ROOT%frontend" && (if not exist node_modules npm install) && npm run dev"

echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
endlocal
