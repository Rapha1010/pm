import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402


def test_get_board_creates_db():
    with TemporaryDirectory() as tmp_dir:
        db_path = Path(tmp_dir) / "pm2.db"
        os.environ["PM2_DB_PATH"] = str(db_path)

        with TestClient(app) as client:
            response = client.get("/api/board")

        assert response.status_code == 200
        payload = response.json()
        assert db_path.exists()
        assert "columns" in payload
        assert "cards" in payload
        assert len(payload["columns"]) == 5


def test_put_board_updates_board():
    with TemporaryDirectory() as tmp_dir:
        db_path = Path(tmp_dir) / "pm2.db"
        os.environ["PM2_DB_PATH"] = str(db_path)

        payload = {
            "columns": [
                {"id": "col-1", "title": "Todo", "cardIds": ["card-1"]},
                {"id": "col-2", "title": "Done", "cardIds": []},
            ],
            "cards": {
                "card-1": {
                    "id": "card-1",
                    "title": "Write tests",
                    "details": "Ensure API updates stick.",
                }
            },
        }

        with TestClient(app) as client:
            update = client.put("/api/board", json=payload)
            assert update.status_code == 200

            get_board = client.get("/api/board")
            assert get_board.status_code == 200

        updated = get_board.json()
        assert updated["columns"][0]["title"] == "Todo"
        assert updated["columns"][0]["cardIds"] == ["card-1"]
        assert updated["cards"]["card-1"]["title"] == "Write tests"


def test_put_board_rejects_missing_cards():
    with TemporaryDirectory() as tmp_dir:
        db_path = Path(tmp_dir) / "pm2.db"
        os.environ["PM2_DB_PATH"] = str(db_path)

        payload = {
            "columns": [{"id": "col-1", "title": "Todo", "cardIds": ["card-x"]}],
            "cards": {},
        }

        with TestClient(app) as client:
            response = client.put("/api/board", json=payload)

        assert response.status_code == 400
