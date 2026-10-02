import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_app

app = create_app()
client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "device" in data
    assert "modules" in data
    assert "crack_detection" in data["modules"]
    assert "pothole_detection" in data["modules"]
    assert "safety_detection" in data["modules"]


def test_invalid_module_analyze():
    response = client.post(
        "/api/analyze",
        data={"inspection_type": "invalid_module"},
        files={"file": ("test.jpg", b"fakecontent", "image/jpeg")},
    )
    assert response.status_code in [400, 422]
