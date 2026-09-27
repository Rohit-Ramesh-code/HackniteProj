import math
import numpy as np
from typing import List, Dict, Optional, Tuple
from app.schemas.synthetic_schema import (
    SyntheticCameraConfig,
    ActorConfig,
    Waypoint,
    LightingPreset,
    ScenarioPreset,
    VisibilityMetrics,
    CameraPromptResult,
    PromptPreviewResponse
)

# ---------------------------------------------------------------------------
# Presets & Aesthetic Definitions
# ---------------------------------------------------------------------------

CCTV_BASE_PROMPT = (
    "Security camera footage, CCTV surveillance, fixed wall-mounted camera, "
    "wide angle lens, monochrome timestamp overlay in corner, film grain, "
    "low dynamic range."
)

LIGHTING_DESCRIPTIONS: Dict[LightingPreset, str] = {
    LightingPreset.DAYLIGHT: "Bright natural daylight, clear surveillance visibility, crisp shadows.",
    LightingPreset.DUSK: "Dusk twilight lighting, golden hour low angle illumination, long shadows.",
    LightingPreset.NIGHT: "Night surveillance mode, low ambient lighting with infrared/spotlight highlights, security camera grain.",
    LightingPreset.OVERCAST: "Overcast diffused lighting, soft even illumination, muted reflections.",
    LightingPreset.INTERIOR_FLUORESCENT: "Overhead commercial fluorescent lighting, realistic interior facility illumination.",
}

SCENARIO_DESCRIPTIONS: Dict[ScenarioPreset, str] = {
    ScenarioPreset.NORMAL_TRAFFIC: "Walking casually at normal pedestrian pace, routine activity.",
    ScenarioPreset.LOITERING: "Lingering suspiciously near entrance, glancing around nervously, repeatedly checking surroundings.",
    ScenarioPreset.THEFT: "Reaching into unattended bag, looking around to evade detection, quickly concealing item and walking away.",
    ScenarioPreset.DISTURBANCE: "Aggressive altercation, confrontational body language, agitated movement.",
    ScenarioPreset.PERIMETER_BREACH: "Covertly bypassing boundary, trespassing into restricted zone with heightened vigilance.",
}


class SyntheticSceneEngine:
    def __init__(
        self,
        cameras: List[SyntheticCameraConfig],
        actor: ActorConfig,
        waypoints: List[Waypoint],
        duration: float = 5.0,
        lighting: LightingPreset = LightingPreset.DAYLIGHT
    ):
        self.cameras = cameras
        self.actor = actor
        self.waypoints = sorted(waypoints, key=lambda w: w.t)
        self.duration = max(0.1, duration)
        self.lighting = lighting

    # -----------------------------------------------------------------------
    # Camera Geometry & Coordinate Transforms (Three.js Convention)
    # -----------------------------------------------------------------------

    @staticmethod
    def get_camera_rotation_matrix(rx_deg: float, ry_deg: float, rz_deg: float) -> np.ndarray:
        """
        Computes 3x3 rotation matrix for Euler angles [rx, ry, rz] in degrees.
        Consistent with SetCoverOptimizerService and Three.js XYZ Euler order.
        """
        rx, ry, rz = np.radians([rx_deg, ry_deg, rz_deg])
        
        Rx = np.array([
            [1.0, 0.0, 0.0],
            [0.0, np.cos(rx), -np.sin(rx)],
            [0.0, np.sin(rx), np.cos(rx)]
        ])
        Ry = np.array([
            [np.cos(ry), 0.0, np.sin(ry)],
            [0.0, 1.0, 0.0],
            [-np.sin(ry), 0.0, np.cos(ry)]
        ])
        Rz = np.array([
            [np.cos(rz), -np.sin(rz), 0.0],
            [np.sin(rz), np.cos(rz), 0.0],
            [0.0, 0.0, 1.0]
        ])
        return Rz @ Ry @ Rx

    @classmethod
    def get_camera_axes(cls, rotation_deg: List[float]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Returns normalized (right, up, forward) unit vectors in world space.
        Default camera space: forward=-Z, right=+X, up=+Y.
        """
        R = cls.get_camera_rotation_matrix(rotation_deg[0], rotation_deg[1], rotation_deg[2])
        right = R @ np.array([1.0, 0.0, 0.0])
        up = R @ np.array([0.0, 1.0, 0.0])
        forward = R @ np.array([0.0, 0.0, -1.0])
        return right, up, forward

    # -----------------------------------------------------------------------
    # Trajectory Interpolation
    # -----------------------------------------------------------------------

    def actor_at(self, t: float) -> np.ndarray:
        """Interpolates 3D actor position [x, y, z] at time t."""
        if not self.waypoints:
            return np.array([0.0, 0.0, 0.0], dtype=float)
        
        if t <= self.waypoints[0].t:
            return np.array(self.waypoints[0].position, dtype=float)
        if t >= self.waypoints[-1].t:
            return np.array(self.waypoints[-1].position, dtype=float)

        for i in range(len(self.waypoints) - 1):
            w0, w1 = self.waypoints[i], self.waypoints[i + 1]
            if w0.t <= t <= w1.t:
                dt = max(w1.t - w0.t, 1e-6)
                alpha = (t - w0.t) / dt
                p0 = np.array(w0.position, dtype=float)
                p1 = np.array(w1.position, dtype=float)
                return p0 + alpha * (p1 - p0)

        return np.array(self.waypoints[-1].position, dtype=float)

    # -----------------------------------------------------------------------
    # Spatial Visibility & Metrics
    # -----------------------------------------------------------------------

    def evaluate_visibility(self, camera: SyntheticCameraConfig, t: float) -> Optional[VisibilityMetrics]:
        """
        Computes 3D camera visibility and viewpoint metrics for actor at time t.
        Returns None if out of range or outside camera frustum cone.
        """
        cam_pos = np.array(camera.position, dtype=float)
        actor_pos = self.actor_at(t)
        vec_to_actor = actor_pos - cam_pos
        dist = float(np.linalg.norm(vec_to_actor))

        if dist < 1e-4 or dist > camera.max_range:
            return None

        R = self.get_camera_rotation_matrix(camera.rotation[0], camera.rotation[1], camera.rotation[2])
        # Transform vector from world space to camera local space (R^T * vec)
        local_vec = R.T @ vec_to_actor
        
        # Local space: +X is right, +Y is up, -Z is forward in front of camera
        local_x = float(local_vec[0])
        local_y = float(local_vec[1])
        depth = float(-local_vec[2])  # positive along camera look direction

        if depth <= 0.1:
            return None  # behind camera

        fov_rad = np.radians(camera.fov_degrees)
        tan_half_fov = np.tan(fov_rad / 2.0)

        # Normalized screen frame coordinates: -1.0 to +1.0
        frame_x = (local_x / depth) / tan_half_fov
        frame_y = (local_y / depth) / tan_half_fov

        # Angle offset from principal optical axis
        forward = R @ np.array([0.0, 0.0, -1.0])
        unit_vec = vec_to_actor / dist
        dot = np.clip(np.dot(unit_vec, forward), -1.0, 1.0)
        angle_offset_deg = float(np.degrees(np.arccos(dot)))

        # FOV Cone check (with 15% tolerance margin for peripheral awareness)
        if abs(frame_x) > 1.15 or abs(frame_y) > 1.15 or angle_offset_deg > (camera.fov_degrees / 2.0 * 1.15):
            return None

        # Depth Classification
        if dist < 2.5:
            depth_cat = "extreme foreground"
        elif dist < 5.0:
            depth_cat = "foreground"
        elif dist < 10.0:
            depth_cat = "mid-range"
        else:
            depth_cat = "background"

        # Horizontal Frame Classification
        if frame_x < -0.5:
            horiz_cat = "far left of frame"
        elif frame_x < -0.15:
            horiz_cat = "left side of frame"
        elif frame_x > 0.5:
            horiz_cat = "far right of frame"
        elif frame_x > 0.15:
            horiz_cat = "right side of frame"
        else:
            horiz_cat = "center of frame"

        # Relative Motion Direction
        dt = min(0.2, self.duration / 10.0)
        p_curr = actor_pos
        p_next = self.actor_at(t + dt)
        vel = (p_next - p_curr) / dt
        speed = float(np.linalg.norm(vel))

        if speed < 0.15:
            motion_desc = "standing still and lingering"
        else:
            local_vel = R.T @ vel
            # Compare longitudinal (Z) vs lateral (X) movement in camera frame
            if abs(local_vel[2]) > 1.2 * abs(local_vel[0]):
                motion_desc = "walking away from camera" if local_vel[2] < 0 else "walking toward camera"
            else:
                motion_desc = "walking left to right across frame" if local_vel[0] > 0 else "walking right to left across frame"

        return VisibilityMetrics(
            visible=True,
            distance_meters=round(dist, 2),
            angle_offset_deg=round(angle_offset_deg, 1),
            frame_x=round(float(np.clip(frame_x, -1.0, 1.0)), 2),
            frame_y=round(float(np.clip(frame_y, -1.0, 1.0)), 2),
            depth_category=depth_cat,
            horizontal_category=horiz_cat,
            relative_motion=motion_desc
        )

    # -----------------------------------------------------------------------
    # Prompt Synthesis
    # -----------------------------------------------------------------------

    def build_camera_prompt(self, camera: SyntheticCameraConfig, t: float) -> Tuple[str, Optional[VisibilityMetrics]]:
        """Synthesizes complete natural language diffusion prompt for a specific camera."""
        vis = self.evaluate_visibility(camera, t)
        
        parts: List[str] = [CCTV_BASE_PROMPT]
        
        # Static scene description if available
        if camera.scene_desc:
            parts.append(camera.scene_desc.rstrip(".") + ".")

        # Lighting preset description
        lighting_text = LIGHTING_DESCRIPTIONS.get(self.lighting, LIGHTING_DESCRIPTIONS[LightingPreset.DAYLIGHT])
        parts.append(lighting_text)

        if vis is None:
            # Actor not visible
            parts.append("Static empty facility area, no people visible in camera frame. Unoccupied surveillance shot.")
        else:
            # Actor visible: assemble spatial perspective details
            actor_text = self.actor.description.rstrip(".")
            action_text = self.actor.scenario or SCENARIO_DESCRIPTIONS.get(
                self.actor.scenario_preset or ScenarioPreset.NORMAL_TRAFFIC,
                "moving through the zone"
            )
            
            spatial_details = (
                f"{actor_text.capitalize()} clearly visible in {vis.horizontal_category}, {vis.depth_category} "
                f"({vis.distance_meters:.1f}m distance), {vis.relative_motion}."
            )
            parts.append(spatial_details)
            parts.append(action_text.capitalize().rstrip(".") + ".")
            parts.append("Photorealistic CCTV surveillance capture.")

        return " ".join(parts), vis

    def generate_all_prompts(self, evaluation_time: Optional[float] = None) -> PromptPreviewResponse:
        """Generates prompts and visibility metrics across all configured cameras."""
        if evaluation_time is None:
            if self.waypoints:
                evaluation_time = (self.waypoints[0].t + self.waypoints[-1].t) / 2.0
            else:
                evaluation_time = self.duration / 2.0

        results: List[CameraPromptResult] = []
        for cam in self.cameras:
            prompt, vis = self.build_camera_prompt(cam, evaluation_time)
            results.append(CameraPromptResult(
                camera_id=cam.id,
                camera_name=cam.name or f"Camera {cam.id}",
                prompt=prompt,
                visible=vis is not None,
                visibility_metrics=vis
            ))

        scenario_name = self.actor.scenario_preset.value if self.actor.scenario_preset else "custom"
        return PromptPreviewResponse(
            prompts=results,
            lighting=self.lighting.value,
            scenario=scenario_name,
            evaluated_at_t=round(evaluation_time, 2)
        )
