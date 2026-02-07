from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, export, papers


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="sara-int API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    def healthz() -> dict:
        return {"ok": True}

    app.include_router(auth.router)
    app.include_router(papers.router)
    app.include_router(export.router)

    return app


app = create_app()

