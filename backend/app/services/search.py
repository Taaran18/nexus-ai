import asyncio
import logging

from ddgs import DDGS

logger = logging.getLogger("nexus")


def _search(query: str, max_results: int) -> list[dict]:
    with DDGS() as ddgs:
        return list(ddgs.text(query, max_results=max_results) or [])


async def web_search(query: str, max_results: int = 5) -> list[dict]:
    try:
        rows = await asyncio.wait_for(asyncio.to_thread(_search, query[:300], max_results), timeout=15)
    except Exception as exc:
        logger.warning("web_search_failed error=%s", type(exc).__name__)
        return []
    return [
        {
            "title": r.get("title") or r.get("href", "Result"),
            "url": r.get("href") or r.get("url", ""),
            "snippet": r.get("body", ""),
        }
        for r in rows
        if r.get("href") or r.get("url")
    ]
