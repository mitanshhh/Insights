import os
import sys
import random
import string
from flask import Flask, request, jsonify, redirect, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import sqlite3
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv

from flask_cors import CORS
CORS(app, supports_credentials=True)

# Load env variables from root folder
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ── Wire in the Backend AI engine ────────────────────────────────────────────
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Backend'))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from main import process_query, run_automated_threat_sweep, csv_to_sqlite_db
    from classification_log import process_ssh_logs
    _AI_AVAILABLE = True
except Exception as _e:
    print(f"[WARN] AI engine import failed: {_e}. /api/project/* routes will return 503.")
    _AI_AVAILABLE = False

app = Flask(__name__)
# Enable CORS for next.js dashboard running on port 3000
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret')

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
        
        reset_link = f"http://localhost:3000/login.html?reset_token={token}"
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
        return None, (jsonify({'message': 'Unauthorized'}), 401)
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return data['sub'], None
    except Exception:
        return None, (jsonify({'message': 'Invalid or expired token'}), 401)

def _ai_unavailable():
    return jsonify({'message': 'AI engine unavailable. Check server logs.'}), 503

# ── Data directory (per-project files live here) ─────────────────────────────
_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Backend', 'data'))


@app.route('/api/project/upload', methods=['POST'])
def project_upload():
    """
    Accepts a multipart/form-data POST with:
      - project_id  (string, form field)
      - csv         (file field, .csv)

    Pipeline:
      1. Save raw CSV to Backend/data/<project_id>_raw.csv
      2. Run classification_log.process_ssh_logs() → <project_id>_classified.csv
      3. Run csv_to_sqlite_db() → <project_id>.db
      4. Return { project_id, db_ready: true }
    """
    if not _AI_AVAILABLE:
        return _ai_unavailable()

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
        process_ssh_logs(input_file=raw_path, output_file=classified_path)
        csv_to_sqlite_db(csv_path=classified_path, db_path=db_path)
        return jsonify({'message': 'Project ready', 'project_id': project_id, 'db_ready': True})
    except Exception as e:
        return jsonify({'message': f'Processing failed: {str(e)}'}), 500


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
    app.run(port=8000, debug=True)
