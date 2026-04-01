Backend service for the PM2 MVP.

- FastAPI app entrypoint: backend/app/main.py
- Serves static HTML from backend/static at /
- Example API routes: /api/hello, /api/board (GET/PUT), /api/ai/test (GET), /api/ai/chat (POST)
- Python deps live in backend/requirements.txt and are installed with uv in Docker
- SQLite storage lives at backend/data/pm2.db (or PM2_DB_PATH override)
- Backend tests live in backend/tests
