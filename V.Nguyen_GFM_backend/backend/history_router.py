from fastapi import APIRouter
from .database import get_sessions, get_session_messages

history_router = APIRouter()

@history_router.get("/sessions")
def list_sessions():
    sessions = get_sessions()
    return {"sessions": sessions}

@history_router.get("/sessions/{session_id}")
def get_session(session_id: str):
    messages = get_session_messages(session_id)
    return {"session_id": session_id, "messages": messages}
