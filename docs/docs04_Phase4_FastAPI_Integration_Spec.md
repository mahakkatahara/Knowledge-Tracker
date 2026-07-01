# Phase 4 – FastAPI Integration

## Objective

Connect the React frontend with the Python analytics engine through REST APIs.

The goal is to allow the frontend to request retention calculations, forget risk analysis, and revision recommendations from the Python backend.

---

## Current State

Frontend:
React + Vite

Analytics:
Python Analytics Engine

Current Limitation:
React and Python operate independently.

---

## Target Architecture

React Frontend
      ↓
FastAPI Backend
      ↓
Python Analytics Engine

---

## Backend Structure

backend/
├── analytics/
├── api/
│   ├── main.py
│   ├── routes/
│   │   ├── retention.py
│   │   ├── risk.py
│   │   └── recommendations.py
│   └── schemas/
│       └── models.py

---

## API Endpoints

GET /api/health

POST /api/retention

POST /api/risk

POST /api/recommendations

---

## Input Validation

Use Pydantic models for request and response validation.

---

## Constraints

- Do not add SQLite yet.
- Do not add Machine Learning yet.
- Do not modify dashboard UI.
- Do not remove existing JavaScript functionality.
- Keep backend modular for future FastAPI expansion.

---

## Deliverables

1. FastAPI Application
2. API Routing Layer
3. Pydantic Schemas
4. Retention Endpoint
5. Risk Endpoint
6. Recommendation Endpoint
7. API Documentation

---

## Future Compatibility

The API must be designed so future phases can integrate:

- SQLite
- TF-IDF Retrieval
- Random Forest Prediction
- Revision Scheduler