import os
from dotenv import load_dotenv

# Load env vars from two possible locations (root Hackup/.env and Frontend/.env)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))   # root (GROQ_API_KEY)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))          # Frontend/.env (GOOGLE, SECRET_KEY)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import logs

from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from rate_limit import limiter

app = FastAPI(
    title="Insights API",
    description="Unified FastAPI backend for Insights AI Security Dashboard",
    version="2.0.0",
)

app.state.limiter = limiter

def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too Many Requests. Please slow down.", "error": str(exc.detail)}
    )

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)


@app.get("/")
def home():
    return {"message": "API working"}

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
app.include_router(logs.router)



@app.get("/health")
async def health():
    return {"status": "ok", "service": "Insights API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_excludes=["*.db", "*.csv", "*.db-journal", "*.db-wal", "*.db-shm"])
