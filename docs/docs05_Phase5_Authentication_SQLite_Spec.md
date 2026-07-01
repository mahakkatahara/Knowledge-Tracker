# Phase 5 – Authentication & SQLite Foundation

## Objective

Introduce user authentication and persistent storage using SQLite.

This phase creates the foundation required for:

* User accounts
* Personalized dashboards
* Notes ownership
* Study tracking history
* Future Information Retrieval module
* Future ML personalization

---

## Goals

The system should allow users to:

1. Register an account
2. Login securely
3. Store user data in SQLite
4. Access personalized data
5. Logout from the application

---

## Database

### Users Table

Fields:

* id
* name
* email
* password_hash
* created_at

Requirements:

* Email must be unique
* Passwords must never be stored in plain text
* Store hashed passwords only

---

## Backend Changes

Create authentication module.

Suggested structure:

backend/

* api/

  * auth_routes.py

* database/

  * database.py
  * models.py

* services/

  * auth_service.py

---

## API Endpoints

### Register

POST /api/auth/register

Input:

{
"name": "John Doe",
"email": "[john@example.com](mailto:john@example.com)",
"password": "password123"
}

Response:

{
"message": "User registered successfully"
}

---

### Login

POST /api/auth/login

Input:

{
"email": "[john@example.com](mailto:john@example.com)",
"password": "password123"
}

Response:

{
"message": "Login successful"
}

---

### Auth Health

GET /api/auth/health

Response:

{
"status": "ok"
}

---

## Frontend Requirements

Create:

* Login Page
* Signup Page

Features:

* Form validation
* Error messages
* Successful login feedback

---

## Testing Requirements

Verify:

1. User registration works
2. Duplicate email is rejected
3. Login works with valid credentials
4. Login fails with invalid credentials
5. SQLite records are created correctly
6. Password hashes are stored instead of plain text

---

## Deliverables

* SQLite database integration
* Users table
* Registration API
* Login API
* Login page
* Signup page
* Authentication tests

---

## Out of Scope

* Google Login
* OAuth
* JWT Refresh Tokens
* Role Based Access Control

These features may be added in future phases if required.
