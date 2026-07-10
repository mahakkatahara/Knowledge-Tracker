from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
import os
import logging
import sqlite3
import httpx
from typing import Generator
from backend.database.database import get_db_connection
from backend.services import auth_service

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/auth")

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Full name of the user")
    email: EmailStr = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    access_token: str = Field(..., description="Google OAuth access token from the frontend popup")

def get_db() -> Generator[sqlite3.Connection, None, None]:
    """
    FastAPI dependency yielding a thread-safe connection to the SQLite database.
    Closes the connection after the request finishes.
    """
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

@router.post("/register")
def register(payload: RegisterRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Endpoint to register a new user.
    Hashes password and stores the record in SQLite.
    Returns 400 Bad Request if the email is already registered.
    """
    try:
        auth_service.create_user(db, payload.name, payload.email, payload.password)
        return {"message": "User registered successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception("Registration failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration. Please try again."
        )

@router.post("/login")
def login(payload: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Endpoint to log in a user.
    Verifies stored password hash against submitted plain password.
    Returns 401 Unauthorized if verification fails.
    On success, generates and returns a JWT token.
    """
    user = auth_service.get_user_by_email(db, payload.email)
    if not user or not auth_service.verify_password(user.password_hash, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Generate token
    token = auth_service.create_jwt({"user_id": user.id, "email": user.email})
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name
        }
    }


@router.post("/google")
def google_login(payload: GoogleAuthRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Endpoint for Google Sign-In.
    1. Verifies the access token with Google (tokeninfo) and checks it was
       issued for THIS app (audience must match GOOGLE_CLIENT_ID).
    2. Fetches the verified Google profile (email, name).
    3. Finds or creates the user, then returns the same JWT payload as /login.
    """
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google sign-in is not configured on the server (GOOGLE_CLIENT_ID env var missing)."
        )

    try:
        with httpx.Client(timeout=10.0) as client:
            # Step 1: validate the token and its audience
            token_resp = client.get(
                "https://www.googleapis.com/oauth2/v3/tokeninfo",
                params={"access_token": payload.access_token}
            )
            token_info = token_resp.json()
            if token_resp.status_code != 200 or token_info.get("aud") != google_client_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google token."
                )

            # Step 2: fetch the verified profile
            userinfo_resp = client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.access_token}"}
            )
            if userinfo_resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not fetch your Google profile."
                )
            info = userinfo_resp.json()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Google to verify the sign-in. Please try again."
        )

    email = info.get("email")
    if not email or not info.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your Google account email is not verified."
        )

    # Step 3: find or create the user and issue our JWT
    user = auth_service.get_or_create_oauth_user(db, info.get("name") or "", email)
    token = auth_service.create_jwt({"user_id": user.id, "email": user.email})

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name
        }
    }


@router.get("/health")
def auth_health():
    """
    Auth module health check endpoint.
    """
    return {"status": "ok"}


