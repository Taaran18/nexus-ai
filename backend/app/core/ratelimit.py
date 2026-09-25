import time
from collections import defaultdict, deque

from app.core.errors import AppError


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int, label: str):
        self.limit = limit
        self.window = window_seconds
        self.label = label
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            retry = int(self.window - (now - hits[0])) + 1
            raise AppError(429, "rate_limited", f"You've reached the {self.label} limit. Try again in {retry} seconds.")
        hits.append(now)


chat_limiter = RateLimiter(8, 60, "per-minute message")
upload_limiter = RateLimiter(20, 3600, "upload")
key_limiter = RateLimiter(10, 60, "API key check")
memory_limiter = RateLimiter(10, 60, "memory")
voice_limiter = RateLimiter(12, 60, "voice recording")
