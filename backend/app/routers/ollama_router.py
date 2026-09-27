from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.schemas.ollama_schema import (
    OllamaQueryRequest,
    OllamaQueryResponse
)
from app.services.ollama_service import OllamaService, load_all_incidents

router = APIRouter(prefix="/api/ollama", tags=["Ollama AI Security Assistant"])

@router.get("/status")
async def get_ollama_status() -> Dict[str, Any]:
    """Checks whether the Ollama local daemon is online and lists available models."""
    return OllamaService.check_ollama_health()

@router.get("/incidents")
async def get_all_incidents():
    """Returns library of recorded incidents and synthetic surveillance videos."""
    return {"incidents": load_all_incidents()}

@router.post("/query", response_model=OllamaQueryResponse)
async def query_assistant(req: OllamaQueryRequest) -> OllamaQueryResponse:
    """
    Answers natural language questions about surveillance history and retrieves matching
    synthetically generated or real CCTV video footage.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    return OllamaService.query(req)
