from typing import Dict, List

from pydantic import BaseModel


class Card(BaseModel):
    id: str
    title: str
    details: str


class Column(BaseModel):
    id: str
    title: str
    cardIds: List[str]


class Board(BaseModel):
    columns: List[Column]
    cards: Dict[str, Card]
