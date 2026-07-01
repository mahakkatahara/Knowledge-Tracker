# Knowledge Decay Predictor & Smart Revision Assistant

A web app that tracks what you study, predicts which topics you're most likely to
forget (forget-risk %), recommends what to revise, and answers questions through a
built-in study assistant.

**New in this build:** Upload a PDF of your notes → the app reads the *whole* PDF,
automatically extracts the most important topics, assigns each a **forget-risk %**,
and feeds them into the Dashboard, Study Tracker and Chat Assistant.

---

## Quick start (frontend — this is the demo you run)

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

1. Sign up / log in (auth is local — any email/password works for the demo).
2. Go to **Study Tracker → "Upload PDF — Auto-Extract Topics"** and pick a PDF of
   study notes (text-based, not a scanned image).
3. The extracted topics appear instantly with their risk %, and are added to your
   catalog.
4. Open the **Dashboard** to see the forget-risk distribution and high-risk topics.
5. Open the **Chat Assistant** and ask things like:
   - "What should I revise today?"
   - "Why should I revise <topic name>?"
   - "How is my forgetting risk calculated?"

To build for production: `npm run build` then `npm run preview`.

---

## How the PDF → topics → risk pipeline works

All of this runs **in the browser** (no server needed), in `src/utils/pdfExtractor.js`:

1. **Read PDF** — `pdfjs-dist` extracts the full text of every page.
2. **Information Retrieval** — tokenization, stop-word removal, term-frequency (TF)
   counting, key-phrase (bigram/trigram) scoring, and heading detection are combined
   to rank the most important topics. Near-duplicate / subset topics are removed.
3. **Risk scoring** — each topic is turned into a study record and scored by the
   Ebbinghaus-style decay model in `src/utils/decayEngine.js`. Central, frequently
   covered topics get higher assumed retention; peripheral or complex topics surface
   as higher forget-risk so you know what to revise first.

The forget-risk %, memory retention, recommendations and chat answers are all derived
live from the same `topics` store, so anything you upload immediately shows up
everywhere.

---

## Optional: the analytics / IR backend (FastAPI)

The `backend/` folder contains a full FastAPI service (auth, notes, document
ingestion, embeddings, retrieval, retention/risk/recommendation endpoints, ML).
It is **not required** to run the demo above — the frontend works standalone.

To run it (heavy: installs torch, faiss, sentence-transformers):

```bash
cd backend                # then create/activate a venv
pip install -r requirements.txt
uvicorn backend.api.main:app --reload   # run from the project root
# API docs at http://127.0.0.1:8000/docs
```

Run its tests with `pytest backend/tests` from the project root.

---

## Project structure

```
src/                     React (Vite) frontend
  pages/                 LandingPage, Dashboard, StudyTracker, Notes, ChatAssistant, Login, Signup
  utils/
    pdfExtractor.js      PDF text extraction + IR topic extraction + risk scoring  (NEW)
    decayEngine.js       Ebbinghaus retention / forget-risk / recommendation logic
    mockData.js          Seed topics & notes
  api/notes.js           REST client for the backend (optional)
backend/                 FastAPI service (analytics, ML, IR, search, auth, documents)
docs/                    Phase-by-phase design specs
```

## Notes

- The bundled `.venv`, `node_modules`, and `.git` were removed to keep the archive
  small. Run `npm install` (and optionally `pip install -r backend/requirements.txt`)
  to restore dependencies.
- Scanned, image-only PDFs have no embedded text and won't yield topics — use
  text-based PDFs (exported from Word/Google Docs, LaTeX, most textbooks, etc.).
