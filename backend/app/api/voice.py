import logging
from pathlib import PurePath

from fastapi import APIRouter, Depends, File, UploadFile
from groq import APIStatusError, AsyncGroq

from app.config import settings
from app.core.errors import AppError
from app.core.ratelimit import voice_limiter
from app.core.visitor import Visitor, get_visitor
from app.store import usage

router = APIRouter(prefix="/voice", tags=["voice"])
logger = logging.getLogger("nexus")

_MAX_BYTES = 8 * 1024 * 1024
_MIN_BYTES = 800
_ALLOWED = {".webm", ".ogg", ".mp4", ".m4a", ".mp3", ".wav", ".mpeg", ".mpga", ".flac"}
_client: AsyncGroq | None = None


def _groq() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.groq_api_key, timeout=45, max_retries=1)
    return _client


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), visitor: Visitor = Depends(get_visitor)):
    voice_limiter.check(visitor.ip)
    name = PurePath(file.filename or "voice.webm").name
    if PurePath(name).suffix.lower() not in _ALLOWED:
        raise AppError(
            400, "unsupported_audio", "That recording format isn't supported. Try again in a different browser."
        )
    raw = await file.read(_MAX_BYTES + 1)
    if len(raw) > _MAX_BYTES:
        raise AppError(413, "audio_too_long", "That recording is too long. Keep voice messages under a minute.")
    if len(raw) < _MIN_BYTES:
        raise AppError(
            400, "audio_too_short", "We didn't catch anything. Hold the mic a little longer and speak clearly."
        )
    await usage.consume(visitor.ip, visitor.id, "voice")
    try:
        result = await _groq().audio.transcriptions.create(
            model=settings.whisper_model,
            file=(name, raw, file.content_type or "audio/webm"),
            response_format="json",
            temperature=0,
        )
    except APIStatusError as exc:
        await usage.refund(visitor.ip, "voice")
        if exc.status_code in (401, 403):
            logger.error("groq_key_rejected voice")
            raise AppError(
                503, "voice_unavailable", "Voice input isn't available right now. Please type your message."
            ) from exc
        if exc.status_code == 429:
            raise AppError(
                429, "voice_busy", "Voice input is busy right now. Wait a moment or type your message."
            ) from exc
        raise AppError(502, "transcription_failed", "We couldn't understand that recording. Try again.") from exc
    except Exception as exc:
        await usage.refund(visitor.ip, "voice")
        logger.warning("transcription_failed error=%s", type(exc).__name__)
        raise AppError(502, "transcription_failed", "We couldn't reach the voice service. Try again.") from exc
    text = (getattr(result, "text", "") or "").strip()
    if not text:
        await usage.refund(visitor.ip, "voice")
        raise AppError(422, "no_speech", "We didn't hear any words. Try again a little closer to the mic.")
    return {"text": text}
