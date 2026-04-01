from contextlib import asynccontextmanager
import json
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

from .schemas import AIRequest, AIResponse, Board
from .openrouter import call_openrouter, run_test
from .storage import init_db, load_board, save_board, validate_board_payload


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/api/hello")
def hello() -> dict:
    return {"message": "Hello from FastAPI"}


@app.get("/api/board", response_model=Board)
def get_board(username: str = Query(default="user")) -> Board:
    return load_board(username)


@app.put("/api/board", response_model=Board)
def put_board(board: Board, username: str = Query(default="user")) -> Board:
    is_valid, error = validate_board_payload(board)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    return save_board(username, board)


@app.get("/api/ai/test")
def ai_test() -> dict:
    try:
        result = run_test()
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="OpenRouter request failed") from error
    return {"result": result}


def _build_ai_messages(board: Board, request: AIRequest) -> list[dict]:
    system_prompt = (
        "You are a Kanban assistant. Respond ONLY with valid JSON. "
        "Use this schema: {\"message\": string, \"operations\": [operation] }. "
        "operation fields: type (create|update|move|delete), cardId, columnId, "
        "position, title, details. Use an empty list if no changes."
    )
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for message in request.history:
        messages.append({"role": message.role, "content": message.content})

    board_payload = json.dumps(board.model_dump(), ensure_ascii=False)
    user_content = (
        "Kanban board JSON:\n"
        f"{board_payload}\n\n"
        f"User question:\n{request.question}"
    )
    messages.append({"role": "user", "content": user_content})
    return messages


def _parse_ai_response(content: str) -> AIResponse:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("AI response is not valid JSON")
        data = json.loads(content[start : end + 1])

    if data.get("operations") is None:
        data["operations"] = []
    return AIResponse.model_validate(data)


@app.post("/api/ai/chat", response_model=AIResponse)
def ai_chat(request: AIRequest, username: str = Query(default="user")) -> AIResponse:
    board = load_board(username)
    messages = _build_ai_messages(board, request)
    try:
        content = call_openrouter(messages)
        return _parse_ai_response(content)
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="OpenRouter request failed") from error
    except ValueError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


static_dir = Path(__file__).resolve().parent.parent / "static"
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
