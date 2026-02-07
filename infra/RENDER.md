## Render deployment notes (MVP)

This repo is a monorepo with two services:

- `apps/api`: FastAPI backend
- `apps/web`: Next.js frontend

### Backend (FastAPI)

- **Type**: Render Web Service
- **Root directory**: `apps/api`
- **Build**: `pip install -r requirements.txt`
- **Start**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Disk**: attach a Persistent Disk mounted at `/data/pdfs`

**Env vars**

- `DATABASE_URL`: Render Postgres URL (use `postgresql+psycopg://...`)
- `JWT_SECRET`: strong random string
- `PDF_STORAGE_DIR=/data/pdfs`
- `CORS_ORIGINS`: comma-separated list, include your web URL
- `INVITE_EMAILS`: comma-separated list
- Optional: `INVITE_CODE`
- Optional: `CROSSREF_MAILTO`

**Migrations**

Run once after provisioning Postgres:

```bash
alembic upgrade head
```

You can run this as a one-off Render Shell command in the backend service.

### Frontend (Next.js)

- **Type**: Render Web Service
- **Root directory**: `apps/web`
- **Build**: `npm install && npm run build`
- **Start**: `npm run start -- --port $PORT --hostname 0.0.0.0`

**Env vars**

- `NEXT_PUBLIC_API_BASE_URL`: backend public URL (Render)

### CORS sanity check

If you see CORS errors in the browser:
- ensure the backend `CORS_ORIGINS` includes the exact web origin
- ensure the web uses the correct `NEXT_PUBLIC_API_BASE_URL`

### Test scaffolding

If you want CI later:
- Add a dedicated Postgres “test” DB.
- Run `alembic upgrade head` in the test DB before pytest integration tests.

