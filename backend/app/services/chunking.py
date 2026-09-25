import io
from dataclasses import dataclass

from app.core.errors import AppError

MAX_CHARS = 900
OVERLAP_LINES = 2
MAX_PDF_PAGES = 500


@dataclass
class Page:
    number: int | None
    lines: list[str]


def extract_pages(name: str, raw: bytes) -> list[Page]:
    if name.lower().endswith(".pdf"):
        if not raw.startswith(b"%PDF"):
            raise AppError(400, "invalid_pdf", "This file doesn't look like a valid PDF.")
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(raw))
            if reader.is_encrypted:
                raise AppError(
                    400, "encrypted_pdf", "This PDF is password-protected. Remove the password and upload it again."
                )
            return [
                Page(number=index, lines=(page.extract_text() or "").splitlines())
                for index, page in enumerate(reader.pages[:MAX_PDF_PAGES], start=1)
            ]
        except AppError:
            raise
        except Exception as exc:
            raise AppError(
                400, "unreadable_pdf", "We couldn't read text from this PDF. It may be scanned images or damaged."
            ) from exc
    try:
        return [Page(number=None, lines=raw.decode("utf-8").splitlines())]
    except UnicodeDecodeError as exc:
        raise AppError(400, "bad_encoding", "Text files must be UTF-8 encoded.") from exc


def _pieces(page: Page) -> list[tuple[int, str]]:
    pieces: list[tuple[int, str]] = []
    for number, line in enumerate(page.lines, start=1):
        text = " ".join(line.split())
        if not text:
            continue
        for start in range(0, len(text), MAX_CHARS):
            pieces.append((number, text[start : start + MAX_CHARS]))
    return pieces


def chunk_pages(pages: list[Page], limit: int) -> list[dict]:
    chunks: list[dict] = []
    for page in pages:
        pieces = _pieces(page)
        index = 0
        while index < len(pieces) and len(chunks) < limit:
            size, end = 0, index
            while end < len(pieces) and (end == index or size + len(pieces[end][1]) + 1 <= MAX_CHARS):
                size += len(pieces[end][1]) + 1
                end += 1
            window = pieces[index:end]
            chunks.append(
                {
                    "content": "\n".join(text for _, text in window),
                    "page": page.number,
                    "start_line": window[0][0],
                    "end_line": window[-1][0],
                    "line_numbers": [number for number, _ in window],
                }
            )
            if end >= len(pieces):
                break
            index = max(index + 1, end - OVERLAP_LINES)
    return chunks
