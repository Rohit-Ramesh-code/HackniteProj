from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class VideoIncidentMeta(BaseModel):
    id: str
    camera_id: int | str
    camera_name: str
    video_url: str
    threat_type: str = Field(..., description="theft | loitering | disturbance | perimeter_breach | normal")
    is_threat: bool
    severity: str = Field(default="low", description="low | medium | high | critical")
    timestamp: str
    description: str
    tags: List[str] = []

class OllamaQueryRequest(BaseModel):
    question: str
    model: Optional[str] = Field(default="llama3.2", description="Ollama model name")
    incident_history: Optional[List[VideoIncidentMeta]] = None

class MatchedVideo(BaseModel):
    id: str
    camera_id: int | str
    camera_name: str
    video_url: str
    threat_type: str
    severity: str
    description: str
    relevance_score: float = 1.0

class OllamaQueryResponse(BaseModel):
    answer: str
    matched_videos: List[MatchedVideo] = []
    model_used: str
    status: str
