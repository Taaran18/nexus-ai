import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("nexus")


class AppError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status = status
        self.code = code
        self.message = message
        super().__init__(message)


def not_found(message: str = "We couldn't find what you were looking for.") -> AppError:
    return AppError(404, "not_found", message)


def bad_request(message: str, code: str = "bad_request") -> AppError:
    return AppError(400, code, message)


def _payload(code: str, message: str, request: Request) -> dict:
    return {"error": {"code": code, "message": message, "request_id": getattr(request.state, "request_id", None)}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status, content=_payload(exc.code, exc.message, request))

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(request: Request, exc: StarletteHTTPException):
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(status_code=exc.status_code, content=_payload("http_error", message, request))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(p) for p in first.get("loc", [])[1:]) or "request"
        message = f"Check the {field} field: {first.get('msg', 'invalid value')}."
        return JSONResponse(status_code=422, content=_payload("validation_error", message, request))

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception):
        logger.exception(
            "unhandled_error request_id=%s path=%s", getattr(request.state, "request_id", None), request.url.path
        )
        return JSONResponse(
            status_code=500,
            content=_payload("server_error", "Something went wrong on our side. Try again in a moment.", request),
        )
