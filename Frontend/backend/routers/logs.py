import os
import sys
import sqlite3
import importlib.util
from typing import Optional, List
import json

from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── Paths ───────────────────────────────────────────────────────────────────
_backend_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "Backend")
)
LOGS_DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "logs.db")
)
USERS_DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "users.db")
)
DATA_DIR = os.path.join(_backend_dir, "data")

def _load_backend_module(module_name: str, filename: str):
    """Load a module from Backend/ by absolute path to avoid name collisions."""
    if _backend_dir not in sys.path:
        sys.path.insert(0, _backend_dir)
    spec = importlib.util.spec_from_file_location(
        f"_ai_engine.{module_name}",
        os.path.join(_backend_dir, filename),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

try:
    _ai_main       = _load_backend_module("main",               "main.py")
    _ai_classif    = _load_backend_module("classification_log",  "classification_log.py")

    process_query              = _ai_main.process_query
    run_automated_threat_sweep = _ai_main.run_automated_threat_sweep
    csv_to_sqlite_db           = _ai_main.csv_to_sqlite_db
    validate_sql               = _ai_main.validate_sql
    run_query                  = _ai_main.run_query
    get_schema                 = _ai_main.get_schema
    process_ssh_logs           = _ai_classif.process_ssh_logs

    AI_AVAILABLE = True
except Exception as e:
    import traceback
    error_msg = f"[WARN] AI engine import failed: {e}. AI routes will return 503.\n{traceback.format_exc()}"
    print(error_msg)
    with open(os.path.join(os.path.dirname(__file__), "import_error.txt"), "w") as f:
        f.write(error_msg)
    AI_AVAILABLE = False

from routers.auth import get_token_from_request, decode_token

router = APIRouter()

# ── Project Persistence (to eliminate localStorage mocks) ──────────────────────
def init_project_db():
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            csvUploaded INTEGER DEFAULT 0,
            status TEXT DEFAULT 'ready',
            createdAt INTEGER,
            userId TEXT
        )
    """)
    conn.commit()
    conn.close()

init_project_db()

# ── Models ──────────────────────────────────────────────────────────────────
class QueryPayload(BaseModel):
    question: str

class SQLPayload(BaseModel):
    sql: str

class ProjectCreate(BaseModel):
    name: str

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/api/projects")
async def get_projects(request: Request):
    token = get_token_from_request(request)
    email = decode_token(token)
    
    conn = sqlite3.connect(USERS_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC", (email,))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

@router.delete("/api/project/{id}")
async def delete_project(id: str, request: Request):
    token = get_token_from_request(request)
    decode_token(token)
    
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM projects WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "Project deleted"}

@router.post("/api/project")
async def create_project(request: Request, payload: ProjectCreate):
    token = get_token_from_request(request)
    email = decode_token(token)
    
    import time
    project_id = str(int(time.time() * 1000))
    
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO projects (id, name, csvUploaded, status, createdAt, userId) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, payload.name, 0, 'ready', int(time.time() * 1000), email)
    )
    conn.commit()
    conn.close()
    
    return {"id": project_id, "name": payload.name, "status": "ready", "csvUploaded": 0}

@router.post("/api/upload-csv")
async def upload_csv(
    request: Request,
    project_id: str = Form(...),
    project_name: Optional[str] = Form(None),
    csv: UploadFile = File(...)
):
    if not AI_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI Engine not available")
    
    token = get_token_from_request(request)
    email = decode_token(token)

    os.makedirs(DATA_DIR, exist_ok=True)
    raw_path = os.path.join(DATA_DIR, f"{project_id}_raw.csv")
    classified_path = os.path.join(DATA_DIR, f"{project_id}_classified.csv")
    
    # Save the file
    contents = await csv.read()
    with open(raw_path, "wb") as f:
        f.write(contents)
    
    # Run pipeline
    try:
        process_ssh_logs(input_file=raw_path, output_file=classified_path)
        # Use the central logs.db but maybe update the logic if possible to keep multi-project?
        # For now, following prompt "Save into security_logs table in logs.db"
        csv_to_sqlite_db(csv_path=classified_path, db_path=LOGS_DB_PATH, table_name="security_logs")
        
        # Update project info
        import time
        conn = sqlite3.connect(USERS_DB_PATH)
        cursor = conn.cursor()
        
        if project_name:
            cursor.execute("UPDATE projects SET name = ?, csvUploaded = 1, status = 'ready' WHERE id = ?", 
                           (project_name, project_id))
        else:
            cursor.execute("UPDATE projects SET csvUploaded = 1, status = 'ready' WHERE id = ?", 
                           (project_id,))
        
        conn.commit()
        conn.close()
        
        return {"message": "Log processed and stored in logs.db", "db_ready": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/query")
async def query_ai(request: Request, payload: QueryPayload):
    if not AI_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI Engine not available")
    
    token = get_token_from_request(request)
    decode_token(token)
    
    try:
        # main.py/process_query handles the check_guardrails → nl_to_sql → run_query → analyze_soc_threat
        # It defaults to the common logs.db if not provided
        result = process_query(payload.question, db_path=LOGS_DB_PATH)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/threat/sweep")
async def threat_sweep(request: Request):
    if not AI_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI Engine not available")
    
    token = get_token_from_request(request)
    decode_token(token)
    
    try:
        report = run_automated_threat_sweep(db_path=LOGS_DB_PATH)
        # Prompt says: Return the automated_threat_report.json data as response.
        # If it doesn't exist, we take the result of sweep.
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/sql")
async def sql_investigation(request: Request, payload: SQLPayload):
    if not AI_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI Engine not available")
    
    token = get_token_from_request(request)
    decode_token(token)
    
    try:
        # Validate and execute
        # validate_sql is imported from main.py
        is_valid, msg = validate_sql(payload.sql)
        if not is_valid:
            raise HTTPException(status_code=400, detail=msg)
            
        local_conn = sqlite3.connect(LOGS_DB_PATH)
        local_conn.row_factory = sqlite3.Row
        local_cur = local_conn.cursor()
        
        # Get schema from logs.db
        schema = get_schema(local_cur)
        
        # run_query takes (sql, user_query, schema, cur)
        cols, rows = run_query(payload.sql, payload.sql, schema, cur=local_cur)
        local_conn.close()
        
        return {"columns": cols, "rows": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
