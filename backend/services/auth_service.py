import hashlib
import os
import sqlite3
import base64
import hmac
from typing import Optional, Dict, Any
from backend.database.models import DBUser


# Password Hashing Utilities using PBKDF2-SHA256
def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a random salt.
    Returns the salt and hash formatted as 'salt:hash'.
    """
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000  # Number of iterations
    )
    return f"{salt.hex()}:{pw_hash.hex()}"

def verify_password(stored_password_hash: str, password: str) -> bool:
    """
    Verifies a password against its stored PBKDF2 salt and hash.
    """
    try:
        if not stored_password_hash or ":" not in stored_password_hash:
            return False
        salt_hex, hash_hex = stored_password_hash.split(":")
        salt = bytes.fromhex(salt_hex)
        pw_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt,
            100000
        )
        return pw_hash.hex() == hash_hex
    except Exception:
        return False

# Database CRUD Ops for Auth
def get_user_by_email(conn: sqlite3.Connection, email: str) -> Optional[DBUser]:
    """
    Retrieves a user record by email address.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?", (email.lower().strip(),))
    row = cursor.fetchone()
    if row:
        return DBUser.from_row(row)
    return None

def create_user(conn: sqlite3.Connection, name: str, email: str, password_plain: str) -> DBUser:
    """
    Creates a new user record in SQLite.
    Raises ValueError if email is duplicate.
    """
    email_clean = email.lower().strip()
    
    # Check for duplicate email
    if get_user_by_email(conn, email_clean) is not None:
        raise ValueError("Email already registered")
        
    password_hash = hash_password(password_plain)
    
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (name.strip(), email_clean, password_hash)
    )
    conn.commit()
    
    # Retrieve and return the created user
    cursor.execute("SELECT id, name, email, password_hash, created_at FROM users WHERE id = ?", (cursor.lastrowid,))
    row = cursor.fetchone()
    return DBUser.from_row(row)


# JWT Helpers
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-for-knowledge-tracker")

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict, expires_in: int = 3600 * 24) -> str:
    """
    Creates a standard HS256 JWT using standard libraries.
    """
    import json
    import time
    
    payload_copy = payload.copy()
    payload_copy["exp"] = int(time.time()) + expires_in
    
    header = {"alg": "HS256", "typ": "JWT"}
    
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload_copy).encode('utf-8'))
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(JWT_SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str) -> Optional[dict]:
    """
    Decodes and validates a standard HS256 JWT, verifying the signature and expiration.
    """
    import json
    import time
    
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_signature = hmac.new(JWT_SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        expected_signature_b64 = base64url_encode(expected_signature)
        
        if not hmac.compare_digest(signature_b64, expected_signature_b64):
            return None
            
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        
        if "exp" in payload and payload["exp"] < time.time():
            return None
            
        return payload
    except Exception:
        return None



