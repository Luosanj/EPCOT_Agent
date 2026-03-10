from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import os

from planner import LLMGenomicPlanner

LOG_FILE = "conversation_log.txt" # Feel free to change to a path that you have access to modify 


def log_conversation(user_message, assistant_reply, state):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}]\n")
        f.write(f"User: {user_message}\n")
        f.write(f"Assistant: {assistant_reply}\n")
        f.write("-" * 70 + "\n")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "null"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

planner = LLMGenomicPlanner()

UPLOAD_DIR = "uploaded_bams"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Global state (for demo only)
state = {
    "stage": "start",
    "bam_file": None,
    "genomic_region": None,
    "modality": None,
    "selected_protocols": [],
    "disagreement_count": 0
}


# ==============================
# Upload BAM Endpoint
# ==============================

@app.post("/upload_bam")
async def upload_bam(file: UploadFile = File(...)):

    if not file.filename.endswith(".bam"):
        return JSONResponse(
            status_code=400,
            content={"error": "Only .bam files are allowed."}
        )

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Update state
    state.update({
    "bam_file": file_path,
    "stage": "awaiting_region",
    "genomic_region": None,
    "modality": None,
    "selected_protocols": [],
    "disagreement_count": 0
})

    assistant_reply = (
        f"{file.filename} uploaded successfully.\n"
        "Please provide genomic region:\n"
        "chr1, 100000, 200000"
    )

    # Log upload interaction
    log_conversation(
        user_message=f"Uploaded file: {file.filename}",
        assistant_reply=assistant_reply,
        state=state
    )

    return {
        "message": f"{file.filename} uploaded successfully.",
        "next_step": "Please provide genomic region:\nchr1, 100000, 200000"
    }



# ==============================
# Chat Endpoint
# ==============================

class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
def chat(request: ChatRequest):

    if not request.message.strip():
        return {"reply": "Please enter a message."}

    reply = planner.chat(request.message, state)

    # Log conversation
    log_conversation(request.message, reply, state)

    return {"reply": reply}