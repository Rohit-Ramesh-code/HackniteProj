from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

class AlertDispatchPayload(BaseModel):
    recipient_email: str = Field(..., description="Target email address for security alert")
    subject: str = Field(default="[SECURITY ALERT] Spatial Intrusion Detected")
    alert_type: str = Field(default="INTRUSION", description="INTRUSION, CAMERA_OFFLINE, ANOMALY")
    severity: str = Field(default="HIGH", description="CRITICAL, HIGH, MEDIUM, LOW")
    camera_id: Optional[str] = "CAM-01"
    location_coords: Optional[List[float]] = [1.5, 0.0, -3.2]
    timestamp: Optional[str] = None
    description: Optional[str] = "Synthetic intruder movement detected in high-security zone."

class AlertDispatchResponse(BaseModel):
    status: str
    message: str
    recipient: str
    mock_mode: bool
