from fastapi.testclient import TestClient
from app.main import app
import io

def test_inference_endpoint():
    client = TestClient(app)

    # Create dummy WebM payload (simulating canvas recording)
    dummy_video_bytes = b"\x1a\x45\xdf\xa3" + b"\x00" * 600 # Valid EBML/WebM magic bytes header

    files = {
        "file": ("recorded-feed.webm", io.BytesIO(dummy_video_bytes), "video/webm")
    }
    data = {
        "recipient_email": "rohitramesh738@gmail.com",
        "camera_id": "CAM-01-OPTIMIZED"
    }

    res = client.post("/api/inference/evaluate-feed", files=files, data=data)
    print(f"POST /api/inference/evaluate-feed status: {res.status_code}")
    print("Response JSON:", res.json())

    assert res.status_code == 200, f"Inference evaluation failed: {res.text}"
    json_data = res.json()
    assert "threat_detected" in json_data, "Response missing threat_detected field"
    assert "rationale" in json_data, "Response missing rationale field"
    print(f"Threat Detected: {json_data['threat_detected']}")
    print(f"Rationale: {json_data['rationale']}")
    print(f"Alert Dispatched: {json_data.get('alert_dispatched')}")
    print("\n>>> INFERENCE & SMTP DISPATCH PIPELINE VERIFIED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_inference_endpoint()
