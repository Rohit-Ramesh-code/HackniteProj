import logging
import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import aiosmtplib
from typing import Optional
from app.config import settings
from app.schemas.alert_schema import AlertDispatchPayload, AlertDispatchResponse

logger = logging.getLogger("spatial_security.mailer")

class MailerService:
    @staticmethod
    async def send_alert(
        payload: AlertDispatchPayload, 
        video_bytes: Optional[bytes] = None,
        video_filename: str = "spatial_intrusion_clip.webm"
    ) -> AlertDispatchResponse:
        ts = payload.timestamp or datetime.datetime.utcnow().isoformat()
        
        email_text = f"""
=====================================================
 SPATIAL SECURITY ALARM NOTIFICATION
=====================================================
Timestamp: {ts}
Alert Type: {payload.alert_type}
Severity Level: {payload.severity}
Triggering Camera: {payload.camera_id}
Coordinates: {payload.location_coords}

Description & AI Vision Rationale:
{payload.description}
=====================================================
* Video Surveillance Attachment: {video_filename if video_bytes else 'None'}
        """

        smtp_user = settings.effective_smtp_user
        from_email = settings.effective_from_email
        target_recipient = payload.recipient_email if (payload.recipient_email and payload.recipient_email != "security-ops@aegis-spatial.local") else (settings.ALERT_RECIPIENT or payload.recipient_email)

        if settings.SMTP_MOCK_MODE or not smtp_user or not settings.SMTP_PASSWORD:
            print("\n" + "="*50)
            print("[MOCK SMTP DISPATCH] Security Alert Dispatch Logged:")
            print(f"To: {target_recipient}")
            print(f"Subject: {payload.subject}")
            print(f"Attachment Size: {len(video_bytes) if video_bytes else 0} bytes")
            print(email_text)
            print("="*50 + "\n")
            
            return AlertDispatchResponse(
                status="SUCCESS_MOCK",
                message="Alert logged in MOCK mode",
                recipient=target_recipient,
                mock_mode=True
            )

        try:
            # Construct Multipart Email Message
            msg = MIMEMultipart()
            msg["From"] = from_email
            msg["To"] = target_recipient
            msg["Subject"] = payload.subject

            # Attach Text Body
            msg.attach(MIMEText(email_text, "plain"))

            # Attach WebM Video Payload if provided
            if video_bytes and len(video_bytes) > 0:
                video_part = MIMEApplication(video_bytes, _subtype="webm")
                video_part.add_header(
                    "Content-Disposition", 
                    "attachment", 
                    filename=video_filename
                )
                msg.attach(video_part)

            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=smtp_user,
                password=settings.SMTP_PASSWORD,
                start_tls=True
            )

            return AlertDispatchResponse(
                status="SUCCESS",
                message=f"Security alert with video attachment dispatched via SMTP to {target_recipient}",
                recipient=target_recipient,
                mock_mode=False
            )
        except Exception as e:
            logger.error(f"Failed to dispatch SMTP email with attachment: {str(e)}")
            return AlertDispatchResponse(
                status="ERROR",
                message=f"SMTP dispatch failure: {str(e)}",
                recipient=target_recipient,
                mock_mode=False
            )
