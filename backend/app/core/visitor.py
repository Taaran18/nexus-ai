import uuid
from dataclasses import dataclass

from fastapi import Header, Request

from app.config import settings
from app.core.errors import AppError
from app.store import visitors
from app.store.files import valid_id

_WORKSPACE_NAMESPACE = uuid.UUID("6f1c2a44-8d1e-4b5a-9a51-2d0b7c3e9f10")


@dataclass(frozen=True)
class Visitor:
    id: str
    ip: str


def workspace_id(browser_id: str, ip: str) -> str:
    return str(uuid.uuid5(_WORKSPACE_NAMESPACE, f"{browser_id}|{ip}"))


def client_ip(request: Request) -> str:
    if settings.trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "")
        hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
        if hops:
            return hops[-1][:64]
    return (request.client.host if request.client else "unknown")[:64]


async def get_visitor(request: Request, x_visitor_id: str | None = Header(default=None)) -> Visitor:
    visitor_id = (x_visitor_id or "").strip().lower()
    if not valid_id(visitor_id):
        raise AppError(400, "missing_visitor", "Your browser didn't send a trial ID. Reload the page and try again.")
    ip = client_ip(request)
    workspace = workspace_id(visitor_id, ip)
    await visitors.touch(workspace, ip)
    return Visitor(id=workspace, ip=ip)
