from fastapi import APIRouter
from pydantic import BaseModel

from app.services.agent_service import run_agent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat(request: ChatRequest):

    answer = run_agent(request.message)

    return {
        "response": answer
    }
