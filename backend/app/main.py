from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import colmap, optimization, alerts, inference, synthetic, ollama_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Spatial Security Application API - COLMAP Ingestion, 3D Greedy Set Cover Camera Optimization, Gemini Multimodal AI Inference, SMTP Alerts, Synthetic Dataset Generation, and Ollama Natural Language Querying",
    version="1.3.0"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Register API Routers
app.include_router(colmap.router)
app.include_router(optimization.router)
app.include_router(alerts.router)
app.include_router(inference.router)
app.include_router(synthetic.router)
app.include_router(ollama_router.router)

# Mount static directories for video streaming
outputs_path = Path("outputs").resolve()
outputs_path.mkdir(exist_ok=True, parents=True)
app.mount("/outputs", StaticFiles(directory=str(outputs_path)), name="outputs")

videos_path = Path("../frontend/public/videos").resolve() if Path("../frontend/public/videos").exists() else Path("frontend/public/videos").resolve()
if videos_path.exists():
    app.mount("/videos", StaticFiles(directory=str(videos_path)), name="videos")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": settings.APP_NAME,
        "docs": "/docs",
        "mock_smtp": settings.SMTP_MOCK_MODE
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
