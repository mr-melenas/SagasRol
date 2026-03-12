# Tech Stack & Tools
- Frontend: React 18 (TypeScript), Tailwind CSS, React Router, Lucide React.
- Backend: Python 3.10+, FastAPI, SQLAlchemy, Pydantic, PostgreSQL.
- Storage: Supabase Storage (Bucket: `rolsitoData`).
- Testing: Pytest for backend.

# Language Standards
- Code, variables, functions, and internal logs MUST be in ENGLISH.
- User-facing UI text MUST be in SPANISH.

# Frontend Rules (React)
- Use functional components and hooks.
- UX/State: ALWAYS implement Optimistic UI for data mutations. Revert state if the server returns an error.
- Always handle and display `loading` and `error` states for fetch requests.

# Backend Rules (FastAPI)
- DI: Use `db: Session = Depends(get_db)` and `current_user = Depends(get_current_user)`.
- DB Writes: CRITICAL to explicitly call `db.commit()` and `db.refresh(obj)` after any INSERT/UPDATE.
- Uploads: Use the Supabase utility with UUID generation for filenames. Never trust raw user filenames.
- Error Handling: Use FastAPI `HTTPException` for 400/403/404 responses.