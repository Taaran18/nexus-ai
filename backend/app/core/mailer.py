import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("nexus")


def _send(to: str, subject: str, text: str) -> None:
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


async def send_email(to: str, subject: str, text: str) -> bool:
    if not settings.smtp_enabled:
        if not settings.is_production:
            logger.info("email_not_sent_smtp_disabled to=%s subject=%s\n%s", to, subject, text)
        return False
    try:
        await asyncio.to_thread(_send, to, subject, text)
        return True
    except Exception as exc:
        logger.error("email_send_failed error=%s", type(exc).__name__)
        return False
