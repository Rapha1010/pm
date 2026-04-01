from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()


@app.get("/api/hello")
def hello() -> dict:
    return {"message": "Hello from FastAPI"}


static_dir = Path(__file__).resolve().parent.parent / "static"
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
