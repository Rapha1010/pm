import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402


def test_ai_chat_success(monkeypatch):
    response_payload = {
        "message": "Created a new card.",
        "operations": [
            {
                "type": "create",
                "cardId": "card-9",
                "columnId": "col-backlog",
                "position": 0,
                "title": "New card",
                "details": "From AI.",
            }
        ],
    }

    monkeypatch.setattr("app.main.call_openrouter", lambda _messages: json.dumps(response_payload))

    with TestClient(app) as client:
        response = client.post(
            "/api/ai/chat",
            json={"question": "Add a card", "history": [{"role": "user", "content": "Hi"}]},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Created a new card."
    assert body["operations"][0]["type"] == "create"


def test_ai_chat_rejects_bad_json(monkeypatch):
    monkeypatch.setattr("app.main.call_openrouter", lambda _messages: "not-json")

    with TestClient(app) as client:
        response = client.post("/api/ai/chat", json={"question": "Hello", "history": []})

    assert response.status_code == 502
