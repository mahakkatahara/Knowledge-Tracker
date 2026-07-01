from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security_opt = HTTPBearer(auto_error=False)

import sqlite3
from typing import List, Optional

from backend.api.auth_routes import get_db
from backend.api.schemas.models import NoteCreate, NoteUpdate, NoteResponse
from backend.services import auth_service, notes_service
from backend.database.models import DBUser

router = APIRouter(prefix="/notes", tags=["Notes"])
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: sqlite3.Connection = Depends(get_db)
) -> DBUser:
    token = credentials.credentials
    payload = auth_service.decode_jwt(token)

    if not payload or "user_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = auth_service.get_user_by_email(db, payload.get("email", ""))

    if not user:
        cursor = db.cursor()
        cursor.execute(
            "SELECT id, name, email, password_hash, created_at FROM users WHERE id = ?",
            (payload["user_id"],)
        )
        row = cursor.fetchone()

        if row:
            user = DBUser.from_row(row)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user does not exist",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_opt),
    db: sqlite3.Connection = Depends(get_db)
) -> Optional[DBUser]:
    if not credentials:
        return None
    token = credentials.credentials
    payload = auth_service.decode_jwt(token)

    if not payload or "user_id" not in payload:
        return None

    user = auth_service.get_user_by_email(db, payload.get("email", ""))

    if not user:
        cursor = db.cursor()
        cursor.execute(
            "SELECT id, name, email, password_hash, created_at FROM users WHERE id = ?",
            (payload["user_id"],)
        )
        row = cursor.fetchone()

        if row:
            user = DBUser.from_row(row)

    return user


@router.get("", response_model=List[NoteResponse])
def read_notes(
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    notes = notes_service.get_notes_by_user(db, current_user.id)
    return [note.to_dict() for note in notes]


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_new_note(
    payload: NoteCreate,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    note = notes_service.create_note(
        db=db,
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        tags=payload.tags
    )
    return note.to_dict()


@router.get("/{note_id}", response_model=NoteResponse)
def read_note(
    note_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    note = notes_service.get_note_by_id(db, note_id, current_user.id)

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you do not have permission to access it."
        )

    return note.to_dict()


@router.put("/{note_id}", response_model=NoteResponse)
def update_existing_note(
    note_id: int,
    payload: NoteUpdate,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    note = notes_service.update_note(
        db=db,
        note_id=note_id,
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        tags=payload.tags
    )

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you do not have permission to access it."
        )

    return note.to_dict()


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_note(
    note_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    success = notes_service.delete_note(db, note_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you do not have permission to access it."
        )

    return None
@router.post("/upload-pdf", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def upload_pdf(
    file: UploadFile = File(...),
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Upload a PDF, extract text and save it as a note.
    """

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )

    try:
        header = file.file.read(4)
        file.file.seek(0)

        if header != b"%PDF":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file."
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    try:
        import io
        import pypdf

        pdf_bytes = file.file.read()
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))

        extracted_text = ""

        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        extracted_text = extracted_text.strip()

        if not extracted_text:
            extracted_text = "No readable text found inside PDF."

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse PDF: {str(e)}"
        )

    note = notes_service.create_note(
        db=db,
        user_id=current_user.id,
        title=file.filename,
        content=extracted_text,
        tags=["pdf"]
    )

    return note.to_dict()