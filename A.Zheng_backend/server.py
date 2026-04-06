from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from datetime import datetime
import os
from typing import List

from planner import LLMGenomicPlanner

# ==============================
# Logging
# ==============================

LOG_FILE = "conversation_log8.txt"

def log_conversation(user_message, assistant_reply, state):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}]\n")
        f.write(f"User: {user_message}\n")
        f.write(f"Assistant: {assistant_reply}\n")
        f.write("-" * 70 + "\n")


# ==============================
# App Setup
# ==============================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

planner = LLMGenomicPlanner()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploaded_bams")
OUTPUT_DIR = os.path.join(BASE_DIR, "prediction_outputs")
PLOT_DIR = os.path.join(BASE_DIR, "prediction_plots")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(PLOT_DIR, exist_ok=True)


# ==============================
# Global State (demo only)
# ==============================

state = {
    "stage": "start",
    "bam_file": None,
    "genomic_region": None,
    "modality": None,
    "selected_protocols": [],
    "disagreement_count": 0,
    "combined_pickle": None
}


# ==============================
# Upload BAM
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
        f.write(await file.read())

    state.update({
        "bam_file": file_path,
        "stage": "awaiting_region",
        "genomic_region": None,
        "modality": None,
        "selected_protocols": [],
        "disagreement_count": 0,
        "combined_pickle": None
    })

    assistant_reply = (
        f"{file.filename} uploaded successfully.\n"
        "Please provide genomic region:\n"
        "chr1, 100000, 200000"
    )

    log_conversation(
        user_message=f"Uploaded file: {file.filename}",
        assistant_reply=assistant_reply,
        state=state
    )

    return {
        "message": f"{file.filename} uploaded successfully.",
        "next_step": assistant_reply
    }


# ==============================
# Chat Endpoint
# ==============================

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


@app.post("/chat")
def chat(request: ChatRequest):

    if not request.message.strip():
        return {"reply": "Please enter a message."}

    # =============================
    # Enforce workflow FIRST
    # =============================

    if state["stage"] in ["awaiting_bam"]:
        return {"reply": "Please upload a .bam file first."}

    if state["stage"] == "awaiting_modality" and not state.get("genomic_region"):
        return {"reply": "Please provide genomic region first."}

    # =============================
    # Call planner ONCE
    # =============================

    try:
        reply = planner.chat(request.message, state)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"reply": f"Server error: {str(e)}"}

    response = {"reply": reply}

    # =============================
    # Attach outputs
    # =============================

    if state.get("stage") in ["completed", "awaiting_plot_request"]:

        if state.get("combined_pickle"):
            pkl_path = state["combined_pickle"]
            if os.path.exists(pkl_path):
                response["download_url"] = f"/download_pickle?path={pkl_path}"

        if state.get("stacked_plot_1d"):
            plot_path = state["stacked_plot_1d"]
            if os.path.exists(plot_path):
                response["plot_1d_url"] = f"/download_plot?path={plot_path}"

        if state.get("stacked_plot_2d"):
            plot_path = state["stacked_plot_2d"]
            if os.path.exists(plot_path):
                response["plot_2d_url"] = f"/download_plot?path={plot_path}"

    log_conversation(request.message, reply, state)

    return response

# ==============================
# Download PKL
# ==============================

@app.get("/download_pickle")
def download_pickle(path: str):

    if not os.path.exists(path):
        return JSONResponse(
            status_code=404,
            content={"error": f"File not found: {path}"}
        )

    return FileResponse(
        path,
        filename=os.path.basename(path),
        media_type="application/octet-stream"
    )


# ==============================
# Download Plot
# ==============================

@app.get("/download_plot")
def download_plot(path: str):

    if not os.path.exists(path):
        return JSONResponse(
            status_code=404,
            content={"error": f"Plot not found: {path}"}
        )

    return FileResponse(
        path,
        filename=os.path.basename(path),
        media_type="image/png"
    )