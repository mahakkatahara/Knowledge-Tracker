from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.database import init_db

from backend.api.auth_routes import router as auth_router
from backend.api.routes.notes import router as notes_router
from backend.api.routes.search import router as search_router
from backend.api.routes.ml import router as ml_router
from backend.api.routes.retention import router as retention_router
from backend.api.routes.risk import router as risk_router
from backend.api.routes.recommendations import router as recommendations_router
from backend.api.routes.documents import router as documents_router
from backend.api.routes.topics import router as topics_router
from backend.api.routes.sessions import router as sessions_router
from backend.api.routes.quiz_history import router as quiz_history_router
from backend.api.routes.adaptive_revision import router as revision_router

app = FastAPI(
    title="Knowledge Tracker API",
    description="REST API for knowledge retention decay calculations and revision recommendations.",
    version="1.0.0"
)


@app.on_event("startup")
def on_startup():
    init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(retention_router, prefix="/api", tags=["Retention"])
app.include_router(risk_router, prefix="/api", tags=["Risk"])
app.include_router(recommendations_router, prefix="/api", tags=["Recommendations"])
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(notes_router, prefix="/api", tags=["Notes"])
app.include_router(search_router, prefix="/api", tags=["Search"])
app.include_router(documents_router, prefix="/api", tags=["Documents"])
app.include_router(topics_router, prefix="/api", tags=["Topics"])
app.include_router(sessions_router, prefix="/api", tags=["Sessions"])
app.include_router(quiz_history_router, prefix="/api", tags=["Quiz History"])
app.include_router(revision_router, prefix="/api", tags=["Adaptive Revision"])
app.include_router(ml_router, prefix="/api", tags=["ML"])


@app.get("/api/health", tags=["System"])
def health_check():
    return {"status": "ok"}