import os
import sqlite3
import random
import datetime
from typing import Optional

from fastapi import APIRouter, Request, Response, Cookie, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config

router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key_change_in_prod")
ALGORITHM  = "HS256"
DB_PATH    = os.path.join(os.path.dirname(__file__), "..", "users.db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── OAuth Setup ───────────────────────────────────────────────────────────────
config_data = {
    "GOOGLE_CLIENT_ID":     os.getenv("GOOGLE_CLIENT_ID", ""),
    "GOOGLE_CLIENT_SECRET": os.getenv("GOOGLE_CLIENT_SECRET", ""),
}
starlette_config = Config(environ=config_data)
oauth = OAuth(starlette_config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
    client_kwargs={"scope": "openid email profile"},
)

# ── DB Init ───────────────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            google_id     TEXT,
            name          TEXT,
            username      TEXT UNIQUE
        )
    """)
    conn.commit()

    # Safe schema migration — add any missing columns without crashing
    cursor.execute("PRAGMA table_info(users)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    migrations = {
        "name":      "ALTER TABLE users ADD COLUMN name TEXT",
        "username":  "ALTER TABLE users ADD COLUMN username TEXT",
        "google_id": "ALTER TABLE users ADD COLUMN google_id TEXT",
        "password_hash": "ALTER TABLE users ADD COLUMN password_hash TEXT",
    }
    for col, sql in migrations.items():
        if col not in existing_cols:
            try:
                cursor.execute(sql)
            except sqlite3.OperationalError:
                pass

    conn.commit()
    conn.close()

init_db()


def generate_username() -> str:
    adjectives = ["cool", "swift", "brave", "giant", "smart", "wild", "cyber", "neon", "phantom", "delta"]
    nouns      = ["tiger", "falcon", "eagle", "dragon", "wolf", "hacker", "analyst", "node", "nexus", "matrix"]
    return f"{random.choice(adjectives)}_{random.choice(nouns)}_{random.randint(10, 99)}"


def generate_token(email: str) -> str:
    payload = {
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1),
        "iat": datetime.datetime.utcnow(),
        "sub": email,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    """Returns email or raises HTTPException(401)."""
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return data["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_token_from_request(request: Request) -> str:
    """Reads JWT from cookie first, then Authorization header."""
    token = request.cookies.get("auth_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized — no token found")
    return token


# ── Pydantic models ───────────────────────────────────────────────────────────
class RegisterPayload(BaseModel):
    email:    str
    password: str
    name:     Optional[str] = "User"


class LoginPayload(BaseModel):
    email:    str
    password: str


class UpdateProfilePayload(BaseModel):
    name:     Optional[str] = None
    username: Optional[str] = None


class UpdatePasswordPayload(BaseModel):
    password: str


class ForgotPasswordPayload(BaseModel):
    email: str


class ResetPasswordPayload(BaseModel):
    token:        str
    new_password: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/api/register")
async def register(payload: RegisterPayload):
    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE email = ?", (payload.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User already exists")
        hashed   = pwd_context.hash(payload.password)
        username = generate_username()
        cursor.execute(
            "INSERT INTO users (email, password_hash, name, username) VALUES (?, ?, ?, ?)",
            (payload.email, hashed, payload.name, username),
        )
        conn.commit()
        return {"message": "User created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/api/login")
async def login(payload: LoginPayload, response: Response):
    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE email = ?", (payload.email,))
    user = cursor.fetchone()
    conn.close()

    if not user or not pwd_context.verify(payload.password, user[0]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = generate_token(payload.email)
    response.set_cookie(
        key="auth_token", value=token,
        httponly=False, max_age=86400, path="/",
        samesite="lax",
    )
    return {"token": token, "redirect": "/dashboard"}


@router.get("/api/auth/check")
async def auth_check(request: Request):
    token = get_token_from_request(request)
    email = decode_token(token)
    return {"email": email, "valid": True}


@router.get("/api/auth/google")
async def google_auth(request: Request):
    redirect_uri = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/auth/google/callback"
    )
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/api/auth/google/callback")
async def google_callback(request: Request):
    try:
        token     = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo") or {}
        email     = user_info.get("email", "")
        google_id = user_info.get("sub", "")
        name      = user_info.get("name", email.split("@")[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {e}")

    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    if not user:
        username = generate_username()
        cursor.execute(
            "INSERT INTO users (email, google_id, name, username) VALUES (?, ?, ?, ?)",
            (email, google_id, name, username),
        )
        conn.commit()
    elif not user[1]:
        cursor.execute("UPDATE users SET name = ? WHERE email = ?", (name, email))
        conn.commit()
    conn.close()

    jwt_token = generate_token(email)
    response  = RedirectResponse(url="http://localhost:3000/dashboard")
    response.set_cookie(
        key="auth_token", value=jwt_token,
        httponly=False, max_age=86400, path="/",
        samesite="lax",
    )
    return response


@router.get("/api/user/profile")
async def get_user_profile(request: Request):
    token = get_token_from_request(request)
    email = decode_token(token)

    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name, username, email FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"name": user[0] or "User", "username": user[1] or "analyst", "email": user[2]}


@router.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie("auth_token", path="/")
    return {"message": "Logged out"}


@router.post("/api/user/update")
async def update_user(request: Request, payload: UpdateProfilePayload):
    token = get_token_from_request(request)
    email = decode_token(token)

    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        if payload.name is not None:
            cursor.execute("UPDATE users SET name = ? WHERE email = ?", (payload.name, email))
        if payload.username is not None:
            cursor.execute(
                "SELECT email FROM users WHERE username = ? AND email != ?",
                (payload.username, email),
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Username already taken")
            cursor.execute("UPDATE users SET username = ? WHERE email = ?", (payload.username, email))
        conn.commit()
        return {"message": "Profile updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/api/user/update-password")
async def update_password(request: Request, payload: UpdatePasswordPayload):
    token = get_token_from_request(request)
    email = decode_token(token)

    if not payload.password or len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    hashed = pwd_context.hash(payload.password)
    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (hashed, email))
    conn.commit()
    conn.close()
    return {"message": "Password updated successfully"}
