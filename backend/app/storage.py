from __future__ import annotations

import os
import sqlite3
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, Tuple
from uuid import uuid4

from .schemas import Board

INITIAL_BOARD_DATA = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {
            "id": "card-1",
            "title": "Align roadmap themes",
            "details": "Draft quarterly themes with impact statements and metrics.",
        },
        "card-2": {
            "id": "card-2",
            "title": "Gather customer signals",
            "details": "Review support tags, sales notes, and churn feedback.",
        },
        "card-3": {
            "id": "card-3",
            "title": "Prototype analytics view",
            "details": "Sketch initial dashboard layout and key drill-downs.",
        },
        "card-4": {
            "id": "card-4",
            "title": "Refine status language",
            "details": "Standardize column labels and tone across the board.",
        },
        "card-5": {
            "id": "card-5",
            "title": "Design card layout",
            "details": "Add hierarchy and spacing for scanning dense lists.",
        },
        "card-6": {
            "id": "card-6",
            "title": "QA micro-interactions",
            "details": "Verify hover, focus, and loading states.",
        },
        "card-7": {
            "id": "card-7",
            "title": "Ship marketing page",
            "details": "Final copy approved and asset pack delivered.",
        },
        "card-8": {
            "id": "card-8",
            "title": "Close onboarding sprint",
            "details": "Document release notes and share internally.",
        },
    },
}


def get_db_path() -> Path:
    env_path = os.getenv("PM2_DB_PATH")
    if env_path:
        return Path(env_path)
    return Path(__file__).resolve().parent.parent / "data" / "pm2.db"


def _connect() -> sqlite3.Connection:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS boards (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);

            CREATE TABLE IF NOT EXISTS columns (
                id TEXT PRIMARY KEY,
                board_id TEXT NOT NULL REFERENCES boards(id),
                title TEXT NOT NULL,
                position INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);

            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                column_id TEXT NOT NULL REFERENCES columns(id),
                title TEXT NOT NULL,
                details TEXT NOT NULL,
                position INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);
            """
        )


def ensure_user_board(username: str) -> str:
    with _connect() as conn:
        user_id = _get_or_create_user(conn, username)
        board_id = _get_or_create_board(conn, user_id)
        if not _board_has_columns(conn, board_id):
            _seed_board(conn, board_id)
        return board_id


def load_board(username: str) -> Board:
    with _connect() as conn:
        user_id = _get_or_create_user(conn, username)
        board_id = _get_or_create_board(conn, user_id)
        if not _board_has_columns(conn, board_id):
            _seed_board(conn, board_id)

        columns = conn.execute(
            "SELECT id, title FROM columns WHERE board_id = ? ORDER BY position",
            (board_id,),
        ).fetchall()

        if not columns:
            return Board.model_validate(INITIAL_BOARD_DATA)

        column_ids = [row["id"] for row in columns]
        cards_by_column: Dict[str, list[str]] = defaultdict(list)
        cards: Dict[str, Dict[str, str]] = {}

        placeholders = ",".join("?" for _ in column_ids)
        rows = conn.execute(
            f"""
            SELECT id, column_id, title, details
            FROM cards
            WHERE column_id IN ({placeholders})
            ORDER BY column_id, position
            """,
            column_ids,
        ).fetchall()

        for row in rows:
            cards_by_column[row["column_id"]].append(row["id"])
            cards[row["id"]] = {
                "id": row["id"],
                "title": row["title"],
                "details": row["details"],
            }

        board = {
            "columns": [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "cardIds": cards_by_column.get(row["id"], []),
                }
                for row in columns
            ],
            "cards": cards,
        }
        return Board.model_validate(board)


def save_board(username: str, board: Board) -> Board:
    with _connect() as conn:
        user_id = _get_or_create_user(conn, username)
        board_id = _get_or_create_board(conn, user_id)
        _replace_board_contents(conn, board_id, board)
    return load_board(username)


def _get_or_create_user(conn: sqlite3.Connection, username: str) -> str:
    row = conn.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if row:
        return row["id"]
    user_id = f"user-{uuid4().hex[:10]}"
    conn.execute(
        "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
        (user_id, username, "not_used", _utc_now()),
    )
    return user_id


def _get_or_create_board(conn: sqlite3.Connection, user_id: str) -> str:
    row = conn.execute(
        "SELECT id FROM boards WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    if row:
        return row["id"]
    board_id = f"board-{uuid4().hex[:10]}"
    now = _utc_now()
    conn.execute(
        """
        INSERT INTO boards (id, user_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (board_id, user_id, "Main Board", now, now),
    )
    return board_id


def _board_has_columns(conn: sqlite3.Connection, board_id: str) -> bool:
    row = conn.execute(
        "SELECT COUNT(1) as count FROM columns WHERE board_id = ?",
        (board_id,),
    ).fetchone()
    return bool(row and row["count"] > 0)


def _seed_board(conn: sqlite3.Connection, board_id: str) -> None:
    board = Board.model_validate(INITIAL_BOARD_DATA)
    _replace_board_contents(conn, board_id, board)


def _replace_board_contents(
    conn: sqlite3.Connection, board_id: str, board: Board
) -> None:
    conn.execute(
        "DELETE FROM cards WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)",
        (board_id,),
    )
    conn.execute("DELETE FROM columns WHERE board_id = ?", (board_id,))

    now = _utc_now()

    for col_index, column in enumerate(board.columns):
        conn.execute(
            "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
            (column.id, board_id, column.title, col_index),
        )

        for card_index, card_id in enumerate(column.cardIds):
            card = board.cards[card_id]
            conn.execute(
                """
                INSERT INTO cards (id, column_id, title, details, position, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    card.id,
                    column.id,
                    card.title,
                    card.details,
                    card_index,
                    now,
                    now,
                ),
            )

    conn.execute(
        "UPDATE boards SET updated_at = ? WHERE id = ?",
        (now, board_id),
    )


def validate_board_payload(board: Board) -> Tuple[bool, str]:
    card_ids: Iterable[str] = (card_id for column in board.columns for card_id in column.cardIds)
    missing = [card_id for card_id in card_ids if card_id not in board.cards]
    if missing:
        return False, f"Missing card definitions for: {', '.join(missing)}"
    return True, ""
