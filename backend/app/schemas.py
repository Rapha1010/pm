from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


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


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AIRequest(BaseModel):
    question: str
    history: List[ChatMessage] = Field(default_factory=list)


class AIOperation(BaseModel):
    type: Literal["create", "update", "move", "delete"]
    cardId: Optional[str] = None
    columnId: Optional[str] = None
    position: Optional[int] = None
    title: Optional[str] = None
    details: Optional[str] = None


class AIResponse(BaseModel):
    message: str
    operations: List[AIOperation] = Field(default_factory=list)
