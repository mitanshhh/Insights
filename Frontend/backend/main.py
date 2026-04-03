import os
from dotenv import load_dotenv

# Load env vars from two possible locations (root Hackup/.env and Frontend/.env)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))   # root (GROQ_API_KEY)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))          # Frontend/.env (GOOGLE, SECRET_KEY)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from routers import auth, logs

app = FastAPI(
    title="Insights API",
    description="Unified FastAPI backend for Insights AI Security Dashboard",
    version="2.0.0",
)

# ── Session middleware (required by authlib OAuth for state/nonce storage) ──
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "default_secret_key_change_in_prod"),
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(logs.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Insights API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_excludes=["*.db", "*.csv", "*.db-journal", "*.db-wal", "*.db-shm"])
