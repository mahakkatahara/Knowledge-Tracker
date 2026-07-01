# Phase 3 – Python Analytics Engine

## Objective

Introduce a Python analytics layer that mirrors the existing JavaScript decay engine calculations.

The goal is to prepare the project for future FastAPI integration while keeping the current React application fully functional.

---

## Background

Phase 2 introduced a centralized JavaScript analytics engine:

* Retention Score Calculation
* Forget Risk Calculation
* Recommendation Ranking

These calculations currently exist in:

src/utils/decayEngine.js

Phase 3 will create equivalent Python implementations.

---

## Python Project Structure

backend/
├── analytics/
│   ├── retention.py
│   ├── risk_engine.py
│   ├── recommendation.py
│   └── **init**.py
├── tests/
│   ├── test_retention.py
│   ├── test_risk.py
│   └── test_recommendation.py
└── requirements.txt

---

## Retention Engine

File:

backend/analytics/retention.py

Function:

calculate_retention(
quiz_score,
confidence,
revision_count
)

Responsibilities:

* Calculate retention score
* Return value between 0 and 100
* Match existing JavaScript logic

---

## Forget Risk Engine

File:

backend/analytics/risk_engine.py

Function:

calculate_forget_risk(
retention,
days_since_last_study
)

Responsibilities:

* Calculate forget risk
* Return value between 0 and 100
* Match existing JavaScript logic

---

## Recommendation Engine

File:

backend/analytics/recommendation.py

Function:

rank_topics(records)

Responsibilities:

* Sort topics by revision priority
* Use forget risk score
* Use retention score
* Return ranked study recommendations

---

## Unit Testing

Create Python unit tests for:

* Retention calculations
* Forget risk calculations
* Recommendation ranking

Tests should validate expected outputs using sample study records.

---

## Sample Dataset

Create example study records for:

* Dynamic Programming
* Operating Systems
* Graph Algorithms
* React Hooks

These records will be used for testing.

---

## Constraints

* Do not modify React frontend.
* Do not introduce FastAPI yet.
* Do not create API endpoints.
* Do not change dashboard UI.
* Keep calculations compatible with Phase 2 logic.

---

## Deliverables

1. Python Retention Engine
2. Python Forget Risk Engine
3. Python Recommendation Engine
4. Unit Tests
5. Sample Dataset
6. Documentation

---

## Future Compatibility

Design all Python modules so they can later be exposed through FastAPI endpoints without major refactoring.

Future phases may include:

* FastAPI integration
* Machine learning prediction models
* Advanced retention analytics
