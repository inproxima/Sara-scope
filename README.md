# sara-int

PDF ingestion + bibliographic metadata extraction + team coding platform.

## Monorepo layout

- `apps/api`: FastAPI backend
- `apps/web`: Next.js frontend
- `docs`: schema and notes
- `infra`: local dev + deployment notes

## Local development (recommended)

1) Copy env templates

```bash
cp infra/.env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

2) Start Postgres + services

```bash
docker compose -f infra/docker-compose.yml up --build
```

3) Initialize DB schema (first time)

In a separate shell:

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m alembic upgrade head
```

If you see `ModuleNotFoundError: No module named 'psycopg'`, you’re almost certainly running a **global** `alembic` (outside the venv). Using `python -m alembic ...` fixes that.

Then open the web app:
- Web: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`

## Deployment (Render)

See `infra/RENDER.md`.

## Environment variables

See:
- `infra/.env.example`
- `apps/api/.env.example`
- `apps/web/.env.example`

