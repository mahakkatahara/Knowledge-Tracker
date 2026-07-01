# Phase 6 – Dashboard & Protected Routes

## Objective

Introduce authenticated user experience after login.

This phase adds:

* Dashboard page
* Protected routes
* Session persistence
* User profile access
* Logout flow

## Goals

The system should allow users to:

* Stay logged in after page refresh
* Access protected pages only after login
* View a personalized dashboard
* Logout securely
* Retrieve user profile information

---

## Frontend Requirements

### Create

* Dashboard Page
* Protected Route Component

### Routes

* /login
* /signup
* /dashboard

### Route Protection Rules

Authenticated User
→ Access Dashboard

Unauthenticated User
→ Redirect to Login

### Session Persistence

Store authenticated user information in localStorage.

Restore user session on application startup.

---

## Dashboard Requirements

Display:

* Welcome User Name
* User Email

Placeholder statistics:

* Total Notes
* Total Study Sessions

---

## Backend Requirements

### Profile Endpoint

GET /api/user/profile

Response:

{
"id": 1,
"name": "User Name",
"email": "[user@example.com](mailto:user@example.com)"
}

---

## Logout Requirements

Logout should:

* Clear localStorage
* Clear authentication state
* Redirect to Login page

---

## Testing Requirements

Verify:

* Dashboard route protection works
* Session persists after refresh
* Logout works correctly
* Profile endpoint returns expected data
* Unauthenticated users are redirected

---

## Deliverables

* Dashboard Page
* Protected Routes
* Session Persistence
* Profile Endpoint
* Logout Flow

---

## Out of Scope

* Google Login
* OAuth
* Role Based Access Control
* JWT Refresh Tokens
* Admin Dashboard
