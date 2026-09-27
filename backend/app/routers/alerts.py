from fastapi import APIRouter, HTTPException
from app.schemas.alert_schema import AlertDispatchPayload, AlertDispatchResponse
from app.services.mailer import MailerService

router = APIRouter(prefix="/api/alerts", tags=["Security Alerts"])

@router.post("/dispatch", response_model=AlertDispatchResponse)
async def dispatch_security_alert(payload: AlertDispatchPayload):
    """
    Dispatch an SMTP security alert notification for real-time spatial intrusions
    """
    try:
        return await MailerService.send_alert(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch alert: {str(e)}")
