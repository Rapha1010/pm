import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402


def test_ai_test_route_success(monkeypatch):
    monkeypatch.setattr("app.main.run_test", lambda: "4")

    with TestClient(app) as client:
        response = client.get("/api/ai/test")

    assert response.status_code == 200
    assert response.json()["result"] == "4"


def test_ai_test_route_missing_key(monkeypatch):
    def raise_key_error():
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    monkeypatch.setattr("app.main.run_test", raise_key_error)

    with TestClient(app) as client:
        response = client.get("/api/ai/test")

    assert response.status_code == 500
