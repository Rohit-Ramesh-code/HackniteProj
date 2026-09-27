"""
Batch CCTV Synthetic Dataset Generator for AegisSpatial / Larpmaster123

Generates consistent multi-scenario, multi-lighting synthetic CCTV footage
from camera POV snapshots or 3D scene camera viewpoints using diffusion models (Wan 2.2 / Hunyuan).

Usage:
  python generate_dataset.py --images camera_images --steps 20
  python generate_dataset.py --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import io
import json
import os
import sys
import time
from pathlib import Path
from PIL import Image

from app.schemas.synthetic_schema import (
    SyntheticCameraConfig,
    ActorConfig,
    Waypoint,
    LightingPreset,
    ScenarioPreset
)
from app.services.synthetic_scene_engine import (
    SyntheticSceneEngine,
    LIGHTING_DESCRIPTIONS,
    SCENARIO_DESCRIPTIONS
)
from app.services.synthetic_generator import SyntheticGeneratorService

OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True, parents=True)

LIGHTING_VARIATIONS = [
    {"tag": LightingPreset.DAYLIGHT, "desc": LIGHTING_DESCRIPTIONS[LightingPreset.DAYLIGHT]},
    {"tag": LightingPreset.DUSK, "desc": LIGHTING_DESCRIPTIONS[LightingPreset.DUSK]},
    {"tag": LightingPreset.NIGHT, "desc": LIGHTING_DESCRIPTIONS[LightingPreset.NIGHT]},
    {"tag": LightingPreset.OVERCAST, "desc": LIGHTING_DESCRIPTIONS[LightingPreset.OVERCAST]},
]

SCENARIO_VARIATIONS = [
    {
        "tag": ScenarioPreset.NORMAL_TRAFFIC,
        "desc": "walking casually through the corridor at regular pace, checking phone, no suspicious behavior"
    },
    {
        "tag": ScenarioPreset.LOITERING,
        "desc": "loitering near the secure doorway, glancing around nervously, repeatedly checking surroundings"
    },
    {
        "tag": ScenarioPreset.THEFT,
        "desc": "tampering with an unattended bag, checking surroundings to evade detection, swiftly concealing item"
    },
    {
        "tag": ScenarioPreset.DISTURBANCE,
        "desc": "engaging in a heated confrontation, aggressive posture, animated physical gestures"
    },
    {
        "tag": ScenarioPreset.PERIMETER_BREACH,
        "desc": "bypassing restricted perimeter boundary without authorization, crouched cautious movement"
    }
]


def encode_image_base64(path: Path) -> str:
    img = Image.open(path).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


async def run_batch(
    images_dir: Path,
    steps: int = 20,
    fps: int = 16,
    num_frames: int = 17,
    dry_run: bool = False,
    use_mock: bool = False
):
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    images = sorted(p for p in images_dir.iterdir() if p.suffix.lower() in exts) if images_dir.exists() else []

    if not images:
        print(f"[generate_dataset] Notice: No camera snapshot images found in {images_dir}. Using default 3D camera vantage point.")
        # Create default virtual camera
        images = [Path("default_cam1.png")]

    total_jobs = len(images) * len(LIGHTING_VARIATIONS) * len(SCENARIO_VARIATIONS)
    print(f"\n=======================================================")
    print(f" AegisSpatial Synthetic Dataset Generator (Wan 2.2 I2V)")
    print(f"=======================================================")
    print(f"Camera Sources: {len(images)} | Total Variations: {total_jobs}")
    print(f"Diffusion Steps: {steps} | Frames: {num_frames} @ {fps} FPS")
    if dry_run:
        print("Mode: [DRY RUN] - Generating and previewing prompts only\n")

    job_idx = 0
    for img_path in images:
        cam_id = img_path.stem
        img_b64 = encode_image_base64(img_path) if (img_path.exists() and not dry_run) else None

        camera = SyntheticCameraConfig(
            id=cam_id,
            name=f"Camera {cam_id}",
            position=[0.0, 2.5, 5.0],
            rotation=[-20.0, 0.0, 0.0],
            fov_degrees=65.0,
            max_range=15.0,
            base_image=img_b64
        )

        for light in LIGHTING_VARIATIONS:
            for scen in SCENARIO_VARIATIONS:
                job_idx += 1
                label = f"{cam_id}__{light['tag'].value}_{scen['tag'].value}"
                dst_file = OUTPUTS_DIR / f"{label}.mp4"

                actor = ActorConfig(
                    description="a person in dark clothing",
                    scenario=scen["desc"],
                    scenario_preset=scen["tag"]
                )

                waypoints = [
                    Waypoint(t=0.0, position=[-1.5, 0.0, 3.0]),
                    Waypoint(t=2.5, position=[0.0, 0.0, 1.5]),
                    Waypoint(t=5.0, position=[1.5, 0.0, 0.0])
                ]

                engine = SyntheticSceneEngine(
                    cameras=[camera],
                    actor=actor,
                    waypoints=waypoints,
                    duration=5.0,
                    lighting=light["tag"]
                )

                prompt, vis = engine.build_camera_prompt(camera, t=2.5)

                print(f"[{job_idx}/{total_jobs}] {cam_id} | {light['tag'].value} | {scen['tag'].value}")
                print(f"  Target: {dst_file.name}")

                if dry_run:
                    print(f"  Prompt:\n    {prompt[:140]}...\n")
                    continue

                if dst_file.exists():
                    print(f"  [SKIP] Video file already exists.")
                    continue

                t0 = time.time()
                result = await SyntheticGeneratorService.generate_clip(
                    camera=camera,
                    prompt=prompt,
                    steps=steps,
                    fps=fps,
                    num_frames=num_frames,
                    use_mock=use_mock,
                    visible=vis is not None
                )
                elapsed = time.time() - t0

                if result and result.video_url:
                    print(f"  [SAVED] {result.video_url} ({elapsed:.1f}s)\n")
                else:
                    print(f"  [FAILED] Generation error after {elapsed:.1f}s\n")

    print("=======================================================")
    print(f"Batch generation completed. Output directory: {OUTPUTS_DIR.resolve()}")
    print("=======================================================\n")


def main():
    parser = argparse.ArgumentParser(description="AegisSpatial Synthetic CCTV Variation Generator")
    parser.add_argument("--images", default="camera_images", help="Folder containing camera POV snapshots")
    parser.add_argument("--steps", type=int, default=20, help="Diffusion inference steps")
    parser.add_argument("--fps", type=int, default=16, help="Output video FPS")
    parser.add_argument("--frames", type=int, default=17, help="Number of frames (17 or 81)")
    parser.add_argument("--dry-run", action="store_true", help="Preview synthesized prompts only without running inference")
    parser.add_argument("--mock", action="store_true", help="Force mock generator fallback")
    args = parser.parse_args()

    images_dir = Path(args.images)
    asyncio.run(run_batch(
        images_dir=images_dir,
        steps=args.steps,
        fps=args.fps,
        num_frames=args.frames,
        dry_run=args.dry_run,
        use_mock=args.mock
    ))


if __name__ == "__main__":
    main()
