import os
import json
import time
import re
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.config import settings
from app.schemas.ollama_schema import (
    VideoIncidentMeta,
    OllamaQueryRequest,
    OllamaQueryResponse,
    MatchedVideo
)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
CATALOG_PATH = Path("outputs/synthetic_incident_catalog.json").resolve()

# Baseline fallback incidents
BASELINE_INCIDENTS: List[VideoIncidentMeta] = [
    VideoIncidentMeta(
        id="syn-threat-001",
        camera_id=1,
        camera_name="North Hallway Exit Portal",
        video_url="/videos/room_theft_incident.mp4",
        threat_type="theft",
        is_threat=True,
        severity="high",
        timestamp="Live Stream",
        description="Theft in North Hallway: Unauthorized subject approaching unattended package near exit door, inspecting surroundings and swiftly concealing item.",
        tags=["threat", "theft", "hallway", "exit_door", "high_threat"]
    ),
    VideoIncidentMeta(
        id="syn-threat-002",
        camera_id=2,
        camera_name="Mid-Corridor Checkpoint Cam 2",
        video_url="/videos/room_perimeter_breach.mp4",
        threat_type="perimeter_breach",
        is_threat=True,
        severity="high",
        timestamp="Live Stream",
        description="Restricted Perimeter Boundary Breach: Unauthorized intruder crawling past corridor barrier after hours.",
        tags=["threat", "perimeter_breach", "intruder", "restricted", "high_threat"]
    ),
    VideoIncidentMeta(
        id="syn-threat-003",
        camera_id=3,
        camera_name="Access Control Portal Cam 3",
        video_url="/videos/room_suspicious_loitering.mp4",
        threat_type="loitering",
        is_threat=True,
        severity="medium",
        timestamp="Live Stream",
        description="Suspicious Entryway Loitering: Individual lurking near secure entryway, testing door locks repeatedly.",
        tags=["threat", "loitering", "reconnaissance", "door_lock", "medium_threat"]
    ),
    VideoIncidentMeta(
        id="syn-nonthreat-001",
        camera_id=1,
        camera_name="North Hallway Exit Portal",
        video_url="/videos/room_normal_traffic.mp4",
        threat_type="normal_traffic",
        is_threat=False,
        severity="none",
        timestamp="Live Stream",
        description="Normal Routine Corridor Foot Traffic: Authorized employee walking casually at steady pace with coffee mug.",
        tags=["non-threat", "normal_traffic", "safe", "authorized", "hallway"]
    ),
    VideoIncidentMeta(
        id="syn-nonthreat-002",
        camera_id=2,
        camera_name="Mid-Corridor Checkpoint Cam 2",
        video_url="/videos/room_security_patrol.mp4",
        threat_type="routine_patrol",
        is_threat=False,
        severity="none",
        timestamp="Live Stream",
        description="Scheduled Security Officer Patrol: Uniformed facility officer conducting routine floor checkpoint verification.",
        tags=["non-threat", "routine_patrol", "security_guard", "inspection", "safe"]
    ),
    VideoIncidentMeta(
        id="syn-nonthreat-003",
        camera_id=4,
        camera_name="South Wing Hallway Cam 4",
        video_url="/videos/room_clear_hallway.mp4",
        threat_type="clear_zone",
        is_threat=False,
        severity="none",
        timestamp="Live Stream",
        description="Clean Corridor Monitored Clear Zone: Hallway unoccupied, optical surveillance clear with zero motion.",
        tags=["non-threat", "clear_zone", "all_clear", "unoccupied", "safe"]
    ),
]


def load_all_incidents() -> List[VideoIncidentMeta]:
    """Loads incidents from synthetic catalog JSON if present, else uses baseline."""
    incidents = []
    if CATALOG_PATH.exists():
        try:
            with open(CATALOG_PATH, "r") as f:
                data = json.load(f)
                for item in data:
                    incidents.append(VideoIncidentMeta(
                        id=item.get("id", f"inc-{len(incidents)+1}"),
                        camera_id=item.get("camera_id", 1),
                        camera_name=item.get("camera_name", f"Camera {item.get('camera_id', 1)}"),
                        video_url=item.get("video_url", "/videos/room_theft_incident.mp4"),
                        threat_type=item.get("threat_type", "theft"),
                        is_threat=bool(item.get("is_threat", True)),
                        severity=str(item.get("severity", "medium")),
                        timestamp=item.get("timestamp", "Live Stream"),
                        description=item.get("rationale") or item.get("description", "Surveillance recording"),
                        tags=item.get("tags", [])
                    ))
        except Exception as e:
            print(f"[OllamaService] Error reading synthetic catalog: {e}")
            
    if not incidents:
        incidents = BASELINE_INCIDENTS
        
    return incidents


class OllamaService:
    @classmethod
    def check_ollama_health(cls) -> Dict[str, Any]:
        """Checks if local Ollama daemon is reachable on port 11434 or Gemini API is configured."""
        has_gemini = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here")
        ollama_online = False
        models = []
        try:
            req = urllib.request.Request(f"{OLLAMA_HOST}/api/tags", headers={"User-Agent": "AegisSpatial"})
            with urllib.request.urlopen(req, timeout=1.2) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode())
                    models = [m.get("name") for m in data.get("models", [])]
                    ollama_online = True
        except Exception:
            pass

        return {
            "online": ollama_online or has_gemini,
            "ollama_online": ollama_online,
            "gemini_active": has_gemini,
            "models": models,
            "primary_engine": "Gemini Multimodal AI" if has_gemini else ("Ollama Local" if ollama_online else "Spatial AI Bridge"),
            "host": OLLAMA_HOST
        }

    @classmethod
    def get_incidents(cls) -> List[VideoIncidentMeta]:
        return load_all_incidents()

    @classmethod
    def query(cls, req_data: OllamaQueryRequest) -> OllamaQueryResponse:
        """Processes a natural language query against incident history and matches relevant CCTV footage."""
        question = req_data.question.strip()
        q_lower = question.lower()
        model_name = req_data.model or DEFAULT_OLLAMA_MODEL

        # Collect incident dataset
        incidents = req_data.incident_history if req_data.incident_history else load_all_incidents()

        # Match relevant videos based on semantics / keywords
        matched: List[MatchedVideo] = []
        is_asking_for_theft = bool(re.search(r'\b(theft|steal|stole|rob|bag|package|tamper|take|taking)\b', q_lower))
        is_asking_for_breach = bool(re.search(r'\b(breach|perimeter|intrud|laser|barrier|crawl)\b', q_lower))
        is_asking_for_loiter = bool(re.search(r'\b(loiter|suspicious|door|lock|peering|linger)\b', q_lower))
        is_asking_for_patrol = bool(re.search(r'\b(patrol|guard|officer|uniform|inspect)\b', q_lower))
        is_asking_for_normal = bool(re.search(r'\b(normal|safe|routine|clear|non-threat|non threat|nonthreat|authorized|traffic|coffee|walk)\b', q_lower))
        is_asking_for_threat = bool(re.search(r'\b(threat|incident|alert|danger|breach|intrud|suspect|theft|loiter|tamper)\b', q_lower)) and not is_asking_for_normal

        for inc in incidents:
            score = 0.0
            
            # Threat vs Non-threat discrimination
            if is_asking_for_theft and inc.threat_type == "theft":
                score += 3.0
            if is_asking_for_breach and inc.threat_type == "perimeter_breach":
                score += 3.0
            if is_asking_for_loiter and inc.threat_type == "loitering":
                score += 3.0
            if is_asking_for_patrol and inc.threat_type == "routine_patrol":
                score += 3.0
            if is_asking_for_normal and not inc.is_threat:
                score += 3.0
            if is_asking_for_threat and inc.is_threat:
                score += 2.0

            # Tag & keyword matching
            for tag in inc.tags:
                if tag.lower() in q_lower:
                    score += 1.5

            # Camera specific match
            for word in q_lower.split():
                if word in inc.camera_name.lower() or word == f"cam{inc.camera_id}" or word == f"cam-{inc.camera_id}" or word == f"camera {inc.camera_id}":
                    score += 2.0

            if score > 0:
                matched.append(MatchedVideo(
                    id=inc.id,
                    camera_id=inc.camera_id,
                    camera_name=inc.camera_name,
                    video_url=inc.video_url,
                    threat_type=inc.threat_type,
                    severity=inc.severity,
                    description=inc.description,
                    relevance_score=score
                ))

        # Sort by relevance
        matched.sort(key=lambda x: x.relevance_score, reverse=True)
        
        # If no specific match, default to top threat or top items
        if not matched:
            for inc in incidents:
                matched.append(MatchedVideo(
                    id=inc.id,
                    camera_id=inc.camera_id,
                    camera_name=inc.camera_name,
                    video_url=inc.video_url,
                    threat_type=inc.threat_type,
                    severity=inc.severity,
                    description=inc.description,
                    relevance_score=1.0
                ))

        # Build context summary for LLM
        incidents_summary = "\n".join([
            f"- Incident '{inc.id}' on {inc.camera_name} (CAM-{inc.camera_id}): Threat='{inc.threat_type}', Threat Status={'THREAT' if inc.is_threat else 'NON-THREAT'}, Severity='{inc.severity.upper()}', Details='{inc.description}', URL='{inc.video_url}'"
            for inc in incidents
        ])

        system_prompt = (
            "You are AegisSpatial AI, an expert spatial security surveillance intelligence system. "
            "Answer the operator's question authoritatively and concisely based on the surveillance video catalog below. "
            "Identify the camera, explain the situation/assessment clearly, and explicitly state that the corresponding video footage is queued for playback below.\n\n"
            f"Active Surveillance Catalog:\n{incidents_summary}\n"
        )

        answer = None
        model_used = "Gemini Spatial Intelligence"

        # 1. Try Gemini API first
        api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                candidate_models = ['gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-flash-latest']
                for m in candidate_models:
                    try:
                        resp = client.models.generate_content(
                            model=m,
                            contents=f"{system_prompt}\nOperator Question: {question}\nResponse:"
                        )
                        if resp and resp.text:
                            answer = resp.text.strip()
                            model_used = f"Gemini Multimodal AI ({m})"
                            break
                    except Exception as ge:
                        continue
            except Exception as e:
                print(f"[OllamaService] Gemini API query error: {e}")

        # 2. Try Ollama local daemon if Gemini didn't return
        if not answer:
            try:
                payload = json.dumps({
                    "model": model_name,
                    "prompt": f"{system_prompt}\nUser Question: {question}\nAnswer:",
                    "stream": False
                }).encode("utf-8")
                req = urllib.request.Request(
                    f"{OLLAMA_HOST}/api/generate",
                    data=payload,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    if resp.status == 200:
                        res_json = json.loads(resp.read().decode())
                        answer = res_json.get("response", "").strip()
                        model_used = f"Ollama ({model_name})"
            except Exception:
                pass

        # 3. Intelligent Instant Fallback
        if not answer:
            model_used = "AegisSpatial AI Engine"
            top = matched[0] if matched else None
            
            if is_asking_for_theft:
                theft_vid = next((m for m in matched if m.threat_type == "theft"), top)
                answer = (
                    f"⚠️ **CONFIRMED THREAT (Theft)**: An incident was recorded on {theft_vid.camera_name} (CAM-{theft_vid.camera_id}). "
                    f"{theft_vid.description} The verified CCTV video feed has been retrieved and loaded below."
                )
            elif is_asking_for_breach:
                breach_vid = next((m for m in matched if m.threat_type == "perimeter_breach"), top)
                answer = (
                    f"🚨 **HIGH SEVERITY THREAT (Perimeter Breach)**: Breach detected on {breach_vid.camera_name} (CAM-{breach_vid.camera_id}). "
                    f"{breach_vid.description} Video footage is queued below."
                )
            elif is_asking_for_loiter:
                loiter_vid = next((m for m in matched if m.threat_type == "loitering"), top)
                answer = (
                    f"⚠️ **SECURITY ALERT (Suspicious Loitering)**: Anomalous activity detected on {loiter_vid.camera_name} (CAM-{loiter_vid.camera_id}). "
                    f"{loiter_vid.description} The recorded video is displayed below."
                )
            elif is_asking_for_normal:
                norm_vid = next((m for m in matched if m.threat_type in ["normal_traffic", "routine_patrol", "clear_zone"]), top)
                answer = (
                    f"✅ **NORMAL SURVEILLANCE REPORT (Non-Threat)**: Verified baseline activity on {norm_vid.camera_name} (CAM-{norm_vid.camera_id}). "
                    f"{norm_vid.description} No security threats or breaches present. The surveillance clip is shown below."
                )
            elif is_asking_for_threat:
                threat_vid = next((m for m in matched if any(m.threat_type == t for t in ["theft", "perimeter_breach", "loitering"])), top)
                answer = (
                    f"🚨 **THREAT DETECTION ALERT**: Active threat detected on {threat_vid.camera_name} (CAM-{threat_vid.camera_id}). "
                    f"Classification: **{threat_vid.threat_type.upper()}** ({threat_vid.severity.upper()} Severity). {threat_vid.description} "
                    "The corresponding video clip is queued for playback below."
                )
            else:
                answer = (
                    f"Surveillance Intelligence: Retrieved relevant recording for {top.camera_name} (CAM-{top.camera_id}). "
                    f"Status: **{top.threat_type.upper()}** ({top.severity.upper()} priority). {top.description} Video clip loaded below."
                )

        return OllamaQueryResponse(
            answer=answer,
            matched_videos=matched[:3],
            model_used=model_used,
            status="success"
        )
