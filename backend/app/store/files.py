import asyncio
import json
import os
import re
import shutil
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import settings
from app.core.errors import AppError

_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def valid_id(value: str) -> bool:
    return bool(_ID.match(value or ""))


def require_id(value: str, label: str = "item") -> str:
    if not valid_id(value):
        raise AppError(404, "not_found", f"We couldn't find that {label}.")
    return value


def root() -> Path:
    path = settings.data_dir
    path.mkdir(parents=True, exist_ok=True)
    return path


def user_dir(user_id: str) -> Path:
    path = root() / "users" / require_id(user_id, "account")
    path.mkdir(parents=True, exist_ok=True)
    return path


def lock(name: str) -> asyncio.Lock:
    return _locks[name]


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AppError(503, "storage_error", "We couldn't read your saved data. Try again in a moment.") from exc


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, separators=(",", ":"))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
    except OSError as exc:
        Path(tmp).unlink(missing_ok=True)
        raise AppError(
            503, "storage_error", "We couldn't save your changes because storage is unavailable. Try again."
        ) from exc


def remove_tree(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)


def healthy() -> bool:
    try:
        probe = root() / ".health"
        probe.write_text(now_iso(), encoding="utf-8")
        return True
    except OSError:
        return False
