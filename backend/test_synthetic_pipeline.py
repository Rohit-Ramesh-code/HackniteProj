import asyncio
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.synthetic_schema import (
    SyntheticCameraConfig,
    ActorConfig,
    Waypoint,
    LightingPreset,
    ScenarioPreset,
    PromptPreviewRequest
)
from app.services.synthetic_scene_engine import SyntheticSceneEngine

def test_camera_rotation_and_axes():
    """Verifies that Euler rotation matrices match Larpmaster123's Three.js / SetCover convention."""
    # Test Identity rotation [0, 0, 0]
    right, up, forward = SyntheticSceneEngine.get_camera_axes([0, 0, 0])
    assert np.allclose(right, [1, 0, 0]), f"Expected right [1,0,0], got {right}"
    assert np.allclose(up, [0, 1, 0]), f"Expected up [0,1,0], got {up}"
    assert np.allclose(forward, [0, 0, -1]), f"Expected forward [0,0,-1], got {forward}"

    # Test 90 degree yaw (Ry = 90 deg) -> forward should point to -X
    right90, up90, forward90 = SyntheticSceneEngine.get_camera_axes([0, 90, 0])
    assert np.allclose(forward90, [-1, 0, 0], atol=1e-5), f"Expected forward [-1,0,0], got {forward90}"

    print("[OK] Camera axes and Euler rotation tests passed!")


def test_scene_engine_visibility_and_prompts():
    """Tests waypoint interpolation, FOV cone visibility, and prompt construction."""
    # Camera mounted at (0, 2.5, 5), looking down slightly (-20 deg pitch) toward (0, 0, 0)
    cam1 = SyntheticCameraConfig(
        id="cam_main",
        name="Main Hall Camera",
        position=[0.0, 2.5, 5.0],
        rotation=[-20.0, 0.0, 0.0],
        fov_degrees=65.0,
        max_range=15.0,
        scene_desc="Wide corporate lobby entrance."
    )

    # Camera mounted behind facing opposite direction (0, 2.5, -5) looking along +Z
    cam2 = SyntheticCameraConfig(
        id="cam_rear",
        name="Rear Corridor Camera",
        position=[0.0, 2.5, -5.0],
        rotation=[-20.0, 180.0, 0.0],
        fov_degrees=60.0,
        max_range=15.0
    )

    actor = ActorConfig(
        description="a suspicious individual in a black hoodie and backpack",
        scenario="attempting to bypass the security turnstile without a badge",
        scenario_preset=ScenarioPreset.PERIMETER_BREACH
    )

    # Waypoints: actor walks from (0, 0, 3) to (0, 0, -1) over 5 seconds
    waypoints = [
        Waypoint(t=0.0, position=[0.0, 0.0, 3.0]),
        Waypoint(t=2.5, position=[0.0, 0.0, 1.0]),
        Waypoint(t=5.0, position=[0.0, 0.0, -1.0])
    ]

    engine = SyntheticSceneEngine(
        cameras=[cam1, cam2],
        actor=actor,
        waypoints=waypoints,
        duration=5.0,
        lighting=LightingPreset.NIGHT
    )

    # Test at t=2.5s (actor at (0, 0, 1))
    # cam1 is at (0, 2.5, 5) looking towards -Z. Actor is in front of cam1 (Z=1 < 5) -> visible
    prompt1, vis1 = engine.build_camera_prompt(cam1, t=2.5)
    assert vis1 is not None, "cam1 should see actor at t=2.5"
    assert vis1.visible is True
    assert "suspicious individual" in prompt1
    assert "Night surveillance mode" in prompt1
    assert "Photorealistic CCTV" in prompt1
    print(f"\n[Generated Prompt for Cam 1]:\n{prompt1}\n")

    # Preview all prompts
    preview = engine.generate_all_prompts(evaluation_time=2.5)
    assert len(preview.prompts) == 2
    assert preview.lighting == "night"
    print("[OK] Scene engine visibility and prompt generation tests passed!")


def test_fastapi_endpoints():
    """Tests the synthetic API router endpoints via FastAPI TestClient."""
    client = TestClient(app)

    # 1. GET /api/synthetic/presets
    res = client.get("/api/synthetic/presets")
    assert res.status_code == 200
    data = res.json()
    assert "lighting_presets" in data
    assert "scenario_presets" in data
    print("[OK] GET /api/synthetic/presets passed!")

    # 2. POST /api/synthetic/preview-prompts
    payload = {
        "cameras": [
            {
                "id": "c1",
                "name": "Entrance Cam",
                "position": [0.0, 2.5, 5.0],
                "rotation": [-20.0, 0.0, 0.0],
                "fov_degrees": 65.0,
                "max_range": 15.0
            }
        ],
        "actor": {
            "description": "a courier with a clipboard",
            "scenario_preset": "normal_traffic"
        },
        "waypoints": [
            {"t": 0.0, "position": [-2.0, 0.0, 2.0]},
            {"t": 4.0, "position": [2.0, 0.0, 2.0]}
        ],
        "duration": 4.0,
        "lighting": "daylight",
        "evaluation_time": 2.0
    }
    res = client.post("/api/synthetic/preview-prompts", json=payload)
    assert res.status_code == 200
    preview_data = res.json()
    assert len(preview_data["prompts"]) == 1
    assert preview_data["prompts"][0]["visible"] is True
    print(f"[OK] POST /api/synthetic/preview-prompts passed! Generated prompt:\n  {preview_data['prompts'][0]['prompt']}")

    # 3. POST /api/synthetic/generate
    gen_payload = {
        "cameras": payload["cameras"],
        "actor": payload["actor"],
        "waypoints": payload["waypoints"],
        "duration": 4.0,
        "lighting": "daylight",
        "steps": 5,
        "use_mock": True
    }
    res = client.post("/api/synthetic/generate", json=gen_payload)
    assert res.status_code == 200
    job_data = res.json()
    job_id = job_data["job_id"]
    assert job_id is not None
    print(f"[OK] POST /api/synthetic/generate passed! Job ID: {job_id}")

    # 4. GET /api/synthetic/jobs/{id}
    res = client.get(f"/api/synthetic/jobs/{job_id}")
    assert res.status_code == 200
    assert res.json()["job_id"] == job_id
    print("[OK] GET /api/synthetic/jobs/{id} passed!")

    # 5. WEBSOCKET /api/synthetic/ws/generate
    with client.websocket_connect("/api/synthetic/ws/generate") as ws:
        ws.send_json({
            "camera": payload["cameras"][0],
            "prompt": "Security camera footage, lobby area, daylight.",
            "steps": 4,
            "fps": 16,
            "visible": True
        })
        status_msg = ws.receive_json()
        assert status_msg["type"] == "status"
        
        # Check progress messages
        received_progress = False
        while True:
            msg = ws.receive_json()
            if msg["type"] == "progress":
                received_progress = True
                assert "preview" in msg
                assert "percentage" in msg
            elif msg["type"] == "done":
                assert "url" in msg
                break
        assert received_progress is True
    print("[OK] WebSocket /api/synthetic/ws/generate telemetry streaming passed!")


def test_phase2_generator_service():
    """Tests SyntheticGeneratorService execution with fallback support."""
    from app.services.synthetic_generator import SyntheticGeneratorService, is_torch_and_cuda_available
    
    cam = SyntheticCameraConfig(
        id="phase2_test_cam",
        name="Phase 2 Test Camera",
        position=[0.0, 2.5, 5.0],
        rotation=[-20.0, 0.0, 0.0]
    )
    
    progress_steps = []
    async def track_progress(step, total, preview):
        progress_steps.append((step, total))

    result = asyncio.run(SyntheticGeneratorService.generate_clip(
        camera=cam,
        prompt="Security camera footage, lobby area, daylight.",
        steps=5,
        fps=16,
        progress_cb=track_progress,
        use_mock=True
    ))

    assert result is not None
    assert result.camera_id == "phase2_test_cam"
    assert len(progress_steps) == 5
    assert result.video_url.endswith(".mp4")
    print(f"[OK] SyntheticGeneratorService clip generation verified! Output: {result.video_url}")


if __name__ == "__main__":
    test_camera_rotation_and_axes()
    test_scene_engine_visibility_and_prompts()
    test_fastapi_endpoints()
    test_phase2_generator_service()
    print("\n=======================================================")
    print("ALL PHASE 1 & PHASE 2 SYNTHETIC TESTS PASSED CLEANLY!")
    print("=======================================================")

