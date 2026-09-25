import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, chats, documents, folders, me, memory, models
from app.config import settings
from app.core.errors import register_error_handlers
from app.store.files import healthy

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("nexus")

app = FastAPI(
    title="Nexus AI API",
    version="3.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID", "X-Visitor-Id"],
    expose_headers=["Content-Disposition", "X-Request-ID"],
    max_age=600,
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
    request.state.request_id = request_id
    started = time.monotonic()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path != "/health":
        logger.info(
            "request id=%s method=%s path=%s status=%s ms=%d",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            (time.monotonic() - started) * 1000,
        )
    return response


register_error_handlers(app)

for router in (
    me.router,
    chat.router,
    chats.router,
    folders.router,
    documents.router,
    memory.router,
    models.router,
):
    app.include_router(router)


@app.get("/")
def root():
    return {"name": "Nexus AI API", "status": "ok"}


@app.get("/health")
def health():
    storage = healthy()
    return {"status": "ok" if storage else "degraded", "storage": storage, "jev": settings.jev_enabled}
