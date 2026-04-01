from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

from .schemas import Board
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


static_dir = Path(__file__).resolve().parent.parent / "static"
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
