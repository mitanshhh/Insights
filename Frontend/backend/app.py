import os
import sys
import io
import re
import random
import string
import traceback
from flask import Flask, request, jsonify, redirect, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import sqlite3
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv

from flask_cors import CORS

CORS(app, origins=["https://insights-analytics.vercel.app/"])

# Load env variables from root folder
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Force utf-8 for stdout and stderr to prevent UnicodeEncodeError with emojis
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ── Wire in the Backend AI engine ────────────────────────────────────────────
import importlib.util

# Resolve path to the AI engine folder (Hackup/Backend)
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Backend'))

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
    # Use explicit loading to prevent local 'main.py' shadowing
    _ai_main = _load_backend_module("main", "main.py")
    _ai_classif = _load_backend_module("classification_log", "classification_log.py")
    
    process_query = _ai_main.process_query
    run_automated_threat_sweep = _ai_main.run_automated_threat_sweep
    csv_to_sqlite_db = _ai_main.csv_to_sqlite_db
    process_ssh_logs = _ai_classif.process_ssh_logs
    
    _AI_AVAILABLE = True
    print("[OK] AI engine imported successfully.")
except Exception as _e:
    print(f"[WARN] AI engine import failed: {_e}. /api/project/* routes will return 503.")
    _AI_AVAILABLE = False


app = Flask(__name__)
# Enable CORS for next.js dashboard running on port 3000
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB upload limit

@app.errorhandler(413)
def too_large(e):
    return jsonify({'message': 'File too large. Maximum upload size is 50MB.'}), 413

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'message': f'Internal server error: {str(e)}'}), 500

from flask_mail import Mail, Message as MailMessage

# Mail Configuration
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
mail = Mail(app)

# Setup SQLite Database
DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            google_id TEXT,
            name TEXT,
            username TEXT UNIQUE
        )
    ''')
    
    # Handle schema evolution for existing databases
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN name TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN username TEXT UNIQUE")
    except sqlite3.OperationalError:
        pass

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            csvUploaded INTEGER DEFAULT 0,
            status TEXT DEFAULT 'ready',
            createdAt INTEGER,
            userId TEXT
        )
    ''')
        
    conn.commit()
    conn.close()

init_db()

def generate_username():
    adjectives = ["cool", "swift", "brave", "giant", "smart", "wild", "cyber", "neon", "phantom", "delta"]
    nouns = ["tiger", "falcon", "eagle", "dragon", "wolf", "hacker", "analyst", "node", "nexus", "matrix"]
    suffix = random.randint(10, 99)
    return f"{random.choice(adjectives)}_{random.choice(nouns)}_{suffix}"

def generate_token(email):
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
        'iat': datetime.datetime.utcnow(),
        'sub': email
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json or request.form
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', 'User')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            return jsonify({'message': 'User already exists'}), 400
        
        hashed_password = generate_password_hash(password)
        username = generate_username()
        cursor.execute("INSERT INTO users (email, password_hash, name, username) VALUES (?, ?, ?, ?)", 
                       (email, hashed_password, name, username))
        conn.commit()
    except Exception as e:
        return jsonify({'message': 'Error creating user', 'error': str(e)}), 500
    finally:
        conn.close()
        
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or request.form
    email = data.get('email')
    password = data.get('password')
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if user and check_password_hash(user[0], password):
        token = generate_token(email)
        # We will set a cookie in case middleware uses it, AND return it via json
        resp = make_response(jsonify({'token': token, 'redirect': '/dashboard'}))
        # Secure can be handled differently in prod, httponly prevents XSS but we might need it in JS
        resp.set_cookie('auth_token', token, httponly=False, max_age=86400, path='/')
        return resp
        
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/auth/check', methods=['GET'])
def auth_check():
    auth_header = request.headers.get('Authorization')
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    if not token:
        token = request.cookies.get('auth_token')
        
    if not token:
        return jsonify({'message': 'Token missing'}), 401
    
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return jsonify({'email': data['sub'], 'valid': True})
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401

# OAuth Setup
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@app.route('/api/auth/google')
def google_auth():
    redirect_uri = request.host_url + 'api/auth/google/callback'
    return google.authorize_redirect(redirect_uri)

@app.route('/api/auth/google/callback')
def google_authorize():
    try:
        token = google.authorize_access_token()
        user_info = token.get('userinfo')
        email = user_info['email']
        google_id = user_info['sub']
        name = user_info.get('name', email.split('@')[0])
    except Exception as e:
        return jsonify({'message': 'Authentication failed', 'error': str(e)}), 400

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if not user:
        username = generate_username()
        cursor.execute("INSERT INTO users (email, google_id, name, username) VALUES (?, ?, ?, ?)", 
                       (email, google_id, name, username))
        conn.commit()
    else:
        # Update name if missing
        if not user[4]: # name column is index 4 if we look at create table
             cursor.execute("UPDATE users SET name = ? WHERE email = ?", (name, email))
             conn.commit()
             
    conn.close()
    
    jwt_token = generate_token(email)
    resp = make_response(redirect('/dashboard'))
    resp.set_cookie('auth_token', jwt_token, httponly=False, max_age=86400, path='/')
    return resp

@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    auth_header = request.headers.get('Authorization')
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    if not token:
        token = request.cookies.get('auth_token')
        
    if not token:
        return jsonify({'message': 'Unauthorized'}), 401
    
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        email = data['sub']
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name, username, email FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        return jsonify({
            'name': user[0] or 'User',
            'username': user[1] or 'user_default',
            'email': user[2]
        })
    except Exception as e:
        return jsonify({'message': 'Error', 'error': str(e)}), 401

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        # Generate short-lived token for reset
        token = jwt.encode({
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
            'email': email
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        frontend_url = request.host_url.rstrip('/')
        reset_link = f"{frontend_url}/login.html?reset_token={token}"
        msg = MailMessage("Password Reset Request", 
                      sender=app.config['MAIL_USERNAME'],
                      recipients=[email])
        msg.body = f"Click the link to reset your password: {reset_link}"
        try:
            mail.send(msg)
        except Exception as e:
            return jsonify({'message': 'Error sending email', 'error': str(e)}), 500
            
    # Always return success for security
    return jsonify({'message': 'If the email exists, a reset link has been sent.'})

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('new_password')
    
    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        email = decoded['email']
        
        hashed_password = generate_password_hash(new_password)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (hashed_password, email))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Password reset successful'})
    except Exception as e:
        return jsonify({'message': 'Invalid or expired token', 'error': str(e)}), 401

@app.route('/api/user/update', methods=['POST'])
def update_user():
    token = request.cookies.get('auth_token')
    print(f"Token received for update: {token[:20] if token else 'None'}")
    if not token:
        return jsonify({'message': 'Unauthorized'}), 401
    
    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        email = decoded['sub']
        data = request.json
        name = data.get('name')
        username = data.get('username')
        print(f"Updating user {email}: name={name}, username={username}")

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if name is not None:
            cursor.execute("UPDATE users SET name = ? WHERE email = ?", (name, email))
        if username is not None:
            # Check if username is taken
            cursor.execute("SELECT email FROM users WHERE username = ? AND email != ?", (username, email))
            if cursor.fetchone():
                conn.close()
                return jsonify({'message': 'Username already taken'}), 400
            cursor.execute("UPDATE users SET username = ? WHERE email = ?", (username, email))
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Profile updated successfully'})
    except Exception as e:
        print(f"Error updating user: {str(e)}")
        return jsonify({'message': 'Error updating profile', 'error': str(e)}), 401

@app.route('/api/user/update-password', methods=['POST'])
def update_password():
    token = request.cookies.get('auth_token')
    if not token:
        return jsonify({'message': 'Unauthorized'}), 401
    
    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        email = decoded['sub']
        data = request.json
        new_password = data.get('password')
        print(f"Updating password for user {email}")

        if not new_password or len(new_password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400

        hashed_password = generate_password_hash(new_password)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (hashed_password, email))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Password updated successfully'})
    except Exception as e:
        print(f"Error updating password: {str(e)}")
        return jsonify({'message': 'Error updating password', 'error': str(e)}), 401

@app.route('/api/logout', methods=['POST', 'GET'])
def logout():
    # Support GET for simple redirect signout as well
    resp = make_response(redirect('/'))
    resp.delete_cookie('auth_token', path='/')
    return resp

# ─────────────────────────────────────────────────────────────────────────────
# 🔹 AI ENGINE ROUTES
# ─────────────────────────────────────────────────────────────────────────────

def _get_token_email():
    """Helper: extract and verify JWT from cookie or Authorization header.
    Returns (email, None) on success or (None, error_response) on failure."""
    token = request.cookies.get('auth_token')
    if not token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
    if not token:
        return 'anonymous@example.com', None
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return data['sub'], None
    except Exception:
        # For non-JWT tokens (like our anonymous sid)
        return token, None

def _ai_unavailable():
    return jsonify({'message': 'AI engine unavailable. Check server logs.'}), 503

# ── Data directory (per-project files live here) ─────────────────────────────
_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Backend', 'data'))

@app.route('/api/projects', methods=['GET'])
def get_projects():
    email, err = _get_token_email()
    if err:
        return err
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC", (email,))
    rows = cursor.fetchall()
    conn.close()
    
    return jsonify([dict(r) for r in rows])

@app.route('/api/project', methods=['POST'])
def create_project():
    email, err = _get_token_email()
    if err:
        return err
        
    data = request.json or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'message': 'Project name is required'}), 400
        
    import time
    project_id = str(int(time.time() * 1000))
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO projects (id, name, csvUploaded, status, createdAt, userId) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, name, 0, 'ready', int(time.time() * 1000), email)
    )
    conn.commit()
    conn.close()
    
    return jsonify({"id": project_id, "name": name, "status": "ready", "csvUploaded": False})


# ── IMPORTANT: specific routes must come BEFORE wildcard <project_id> routes ──

def _import_csv_direct(raw_path: str, db_path: str):
    """Fallback: import raw CSV to SQLite using pandas.
    Always injects ip_address (regex from Content) and target_label."""
    import pandas as pd
    import sqlite3 as _sql

    df = pd.read_csv(raw_path)
    # Normalise column names
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
    # Deduplicate after normalisation
    df = df.loc[:, ~df.columns.duplicated(keep='last')]

    ip_pattern = re.compile(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})')

    if 'ip_address' not in df.columns:
        content_col = df.get('content', pd.Series([''] * len(df))).astype(str)
        df['ip_address'] = content_col.str.extract(ip_pattern.pattern, expand=False).fillna('Unknown')

    if 'target_label' not in df.columns:
        df['target_label'] = 'Unclassified'

    conn_db = _sql.connect(db_path)
    try:
        df.to_sql('security_logs', conn_db, if_exists='replace', index=False)
        conn_db.commit()
    finally:
        conn_db.close()
    print(f'[FALLBACK] Imported {len(df)} rows with cols: {list(df.columns)}')


@app.route('/api/project/upload', methods=['POST'])
def project_upload():
    email, err = _get_token_email()
    if err:
        return err

    project_id = request.form.get('project_id', '').strip()
    if not project_id:
        return jsonify({'message': 'project_id is required'}), 400

    if 'csv' not in request.files:
        return jsonify({'message': 'csv file is required'}), 400

    csv_file = request.files['csv']
    if csv_file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    os.makedirs(_DATA_DIR, exist_ok=True)

    raw_path        = os.path.join(_DATA_DIR, f'{project_id}_raw.csv')
    classified_path = os.path.join(_DATA_DIR, f'{project_id}_classified.csv')
    db_path         = os.path.join(_DATA_DIR, f'{project_id}.db')

    csv_file.save(raw_path)

    try:
        if _AI_AVAILABLE:
            try:
                process_ssh_logs(input_file=raw_path, output_file=classified_path)
                csv_to_sqlite_db(csv_path=classified_path, db_path=db_path)
                print(f'[OK] AI pipeline succeeded for project {project_id}')
            except Exception as ai_err:
                err_log = os.path.join(os.path.dirname(__file__), 'ai_error_log.txt')
                with open(err_log, 'w') as f:
                    f.write(str(ai_err) + '\n' + traceback.format_exc())
                print(f'[WARN] AI pipeline failed: {ai_err} -- falling back to direct import')
                _import_csv_direct(raw_path, db_path)
        else:
            _import_csv_direct(raw_path, db_path)

        # Verify required columns exist in the written DB
        import sqlite3 as _vsql
        _vc = _vsql.connect(db_path)
        _vcur = _vc.cursor()
        _vcur.execute('PRAGMA table_info(security_logs)')
        _cols = [r[1] for r in _vcur.fetchall()]
        _vc.close()
        if 'ip_address' not in _cols or 'target_label' not in _cols:
            print(f'[WARN] DB missing required cols after pipeline. Cols: {_cols}. Re-running fallback.')
            _import_csv_direct(raw_path, db_path)

        # Mark project as CSV uploaded in users.db
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE projects SET csvUploaded = 1, status = 'ready' WHERE id = ?", (project_id,))
        conn.commit()
        conn.close()

        return jsonify({'message': 'Project ready', 'project_id': project_id, 'db_ready': True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': f'Processing failed: {str(e)}'}), 500


@app.route('/api/sql', methods=['POST'])
def run_sql():
    """Execute an arbitrary SQL query against the active project's database."""
    email, err = _get_token_email()
    if err:
        return err

    body = request.json or {}
    sql = body.get('sql', '').strip()
    project_id = body.get('project_id', '').strip()

    if not sql:
        return jsonify({'message': 'sql is required'}), 400

    # If no project_id provided, try to find any db in DATA_DIR
    if project_id:
        db_path = os.path.join(_DATA_DIR, f'{project_id}.db')
    else:
        # Find most recently modified .db file
        dbs = [f for f in os.listdir(_DATA_DIR) if f.endswith('.db')] if os.path.exists(_DATA_DIR) else []
        if not dbs:
            return jsonify({'message': 'No project database found. Upload a CSV first.'}), 404
        db_path = os.path.join(_DATA_DIR, sorted(dbs, key=lambda f: os.path.getmtime(os.path.join(_DATA_DIR, f)), reverse=True)[0])

    if not os.path.exists(db_path):
        return jsonify({'message': 'Project database not found. Upload a CSV first.'}), 404

    try:
        import sqlite3 as _sql
        conn_db = _sql.connect(db_path)
        conn_db.row_factory = _sql.Row
        cursor = conn_db.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        conn_db.close()
        return jsonify({'columns': columns, 'rows': [dict(r) for r in rows]})
    except Exception as e:
        return jsonify({'message': f'SQL error: {str(e)}'}), 400

@app.route('/api/project/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    email, err = _get_token_email()
    if err:
        return err
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM projects WHERE id = ? AND userId = ?", (project_id, email))
    conn.commit()
    conn.close()
    
    # Optionally delete the files for the project
    db_path = os.path.join(_DATA_DIR, f'{project_id}.db')
    if os.path.exists(db_path):
        os.remove(db_path)
        
    return jsonify({"message": "Project deleted"})






@app.route('/api/project/<project_id>/query', methods=['POST'])
def project_query(project_id):
    """
    POST body: { "question": "How many failed logins?" }

    Returns:
      {
        "answer": {
          "actual_answer": "There were 342 failed login attempts.",
          "json_logs": [ ... ]
        }
      }
    """
    if not _AI_AVAILABLE:
        return _ai_unavailable()

    email, err = _get_token_email()
    if err:
        return err

    body     = request.json or {}
    question = body.get('question', '').strip()
    if not question:
        return jsonify({'message': 'question is required'}), 400

    db_path = os.path.join(_DATA_DIR, f'{project_id}.db')
    if not os.path.exists(db_path):
        return jsonify({'message': 'Project database not found. Please upload a CSV first.'}), 404

    try:
        result = process_query(question, db_path=db_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({'message': f'Query failed: {str(e)}'}), 500


@app.route('/api/project/<project_id>/threat-sweep', methods=['GET'])
def project_threat_sweep(project_id):
    """
    Runs the automated SOC threat sweep against the project's database.

    Returns the full SOC report JSON:
      {
        "executive_summary": "...",
        "threat_level": "High",
        "log_analyses": [ ... ]
      }
    """
    if not _AI_AVAILABLE:
        return _ai_unavailable()

    email, err = _get_token_email()
    if err:
        return err

    db_path = os.path.join(_DATA_DIR, f'{project_id}.db')
    if not os.path.exists(db_path):
        return jsonify({'message': 'Project database not found. Please upload a CSV first.'}), 404

    try:
        report = run_automated_threat_sweep(db_path=db_path)
        return jsonify(report)
    except Exception as e:
        return jsonify({'message': f'Threat sweep failed: {str(e)}'}), 500


if __name__ == '__main__':
    # app.run(port=8000, debug=False, threaded=True)
    app.run(host="0.0.0.0", port=8000)
