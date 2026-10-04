# CiviSight AI — Developer Convenience Makefile
#
# Run from the repository root.
# Requires: Python 3.11 venv at backend/venv, Node.js 18+
#
# Usage:
#   make backend     — start the FastAPI server (port 8000)
#   make frontend    — start the Vite dev server (port 5173)
#   make test        — run the full backend pytest suite
#   make build       — production build of the frontend
#   make health      — curl the health endpoint (requires backend running)
#   make install     — install both backend and frontend dependencies

.PHONY: backend frontend test build health install

# ── Backend ─────────────────────────────────────────────────────────
backend:
	backend/venv/Scripts/python.exe -m uvicorn backend.app.main:app \
		--reload --host 0.0.0.0 --port 8000

# ── Frontend ─────────────────────────────────────────────────────────
frontend:
	cd frontend && npm run dev

# ── Tests ─────────────────────────────────────────────────────────────
test:
	backend/venv/Scripts/python.exe -m pytest backend/app/tests -v

# ── Build ─────────────────────────────────────────────────────────────
build:
	cd frontend && npm run build

# ── Health check ──────────────────────────────────────────────────────
health:
	curl -s http://localhost:8000/api/health | python -m json.tool

# ── Install all dependencies ─────────────────────────────────────────
install:
	backend/venv/Scripts/pip.exe install -r backend/requirements.txt
	cd frontend && npm install
