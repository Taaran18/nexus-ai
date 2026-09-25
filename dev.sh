#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "Created backend/.env from .env.example. Add your keys before chatting."
fi

if [ ! -f "$ROOT/frontend/.env" ]; then
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
  echo "Created frontend/.env from .env.example."
fi

BACKEND_CMD="cd '$ROOT/backend' && if [ ! -d .venv ]; then python3 -m venv .venv; fi && source .venv/bin/activate && pip install -q -r requirements.txt && uvicorn app.main:app --reload --port 8000"
FRONTEND_CMD="cd '$ROOT/frontend' && if [ ! -d node_modules ]; then npm install; fi && npm run dev"

osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "$BACKEND_CMD"
  do script "$FRONTEND_CMD"
end tell
APPLESCRIPT

echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
