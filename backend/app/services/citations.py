import math
import re

_STOP = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "are",
    "was",
    "were",
    "has",
    "have",
    "had",
    "not",
    "but",
    "you",
    "your",
    "our",
    "its",
    "their",
    "they",
    "them",
    "can",
    "will",
    "would",
    "should",
    "could",
    "into",
    "about",
    "which",
    "what",
    "when",
    "where",
    "who",
    "how",
    "than",
    "then",
    "there",
    "these",
    "those",
    "also",
    "any",
    "all",
}
_CITE = re.compile(r"\[(\d{1,2})\]")


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2 and w not in _STOP}


def attach_highlights(answer: str, sources: list[dict]) -> list[dict]:
    documents = [s for s in sources if s.get("type") == "document" and s.get("ref")]
    if not documents:
        return sources
    cited = {int(n) for n in _CITE.findall(answer)}
    sentences = re.split(r"(?<=[.!?])\s+|\n+", answer)
    result = [s for s in sources if s.get("type") != "document"]
    for source in documents:
        if cited and source["ref"] not in cited:
            continue
        related = [s for s in sentences if f"[{source['ref']}]" in s] or sentences
        target = _words(" ".join(related))
        lines = (source.get("quote") or "").split("\n")
        numbers = source.get("line_numbers") or []
        best_index, best_score = None, 0.0
        for index, line in enumerate(lines):
            words = _words(line)
            if not words:
                continue
            score = len(words & target) / math.sqrt(len(words))
            if score > best_score:
                best_index, best_score = index, score
        enriched = {k: v for k, v in source.items() if k != "line_numbers"}
        enriched["cited"] = source["ref"] in cited
        if best_index is not None and best_score > 0:
            enriched["highlight"] = lines[best_index]
            enriched["highlight_line"] = numbers[best_index] if best_index < len(numbers) else None
        result.append(enriched)
    return result
