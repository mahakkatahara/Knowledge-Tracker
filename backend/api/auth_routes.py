from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
import sqlite3
from typing import Generator
from backend.database.database import get_db_connection
from backend.services import auth_service

router = APIRouter(prefix="/auth")

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Full name of the user")
    email: EmailStr = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

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


@router.get("/health")
def auth_health():
    """
    Auth module health check endpoint.
    """
    return {"status": "ok"}


