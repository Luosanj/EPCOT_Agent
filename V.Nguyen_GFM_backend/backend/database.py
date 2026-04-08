import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Supabase URL or Key is missing. Make sure .env is populated.")

# Initialize Supabase client globally
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

def init_db():
    # Supabase initialization happens in the cloud via the SQL setup script.
    # No local creation logic needed here anymore.
    pass

def create_session(session_id: str, filename: str):
    if not supabase: return
    title = f"Analysis of {filename}"
    supabase.table("sessions").insert({
        "session_id": session_id,
        "title": title,
        "filename": filename
    }).execute()

def add_message(session_id: str, role: str, content: str, is_action: bool = False, 
                visual_summary: dict = None, download_url: str = None, 
                plot_1d_url: str = None, plot_2d_url: str = None):
    if not supabase: return
    
    # We do NOT use json.dumps for visual_summary. 
    # Supabase/Postgres natively accepts Python dicts for JSONB columns!
    supabase.table("messages").insert({
        "session_id": session_id,
        "role": role,
        "content": content,
        "is_action": is_action,
        "visual_summary": visual_summary,
        "download_url": download_url,
        "plot_1d_url": plot_1d_url,
        "plot_2d_url": plot_2d_url
    }).execute()

def get_sessions():
    if not supabase: return []
    
    response = supabase.table("sessions").select("*").order("created_at", desc=True).execute()
    return response.data

def get_session_messages(session_id: str):
    if not supabase: return []
    
    response = supabase.table("messages").select("*").eq("session_id", session_id).order("id").execute()
    return response.data

# Dummy init to keep signature identical to sqlite driver
init_db()
