import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "history.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            title TEXT,
            filename TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content TEXT,
            is_action BOOLEAN,
            visual_summary TEXT,
            download_url TEXT,
            plot_1d_url TEXT,
            plot_2d_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES sessions(session_id)
        )
    ''')
    conn.commit()
    conn.close()

def create_session(session_id: str, filename: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    title = f"Analysis of {filename}"
    c.execute(
        "INSERT INTO sessions (session_id, title, filename) VALUES (?, ?, ?)",
        (session_id, title, filename)
    )
    conn.commit()
    conn.close()

def add_message(session_id: str, role: str, content: str, is_action: bool = False, 
                visual_summary: dict = None, download_url: str = None, 
                plot_1d_url: str = None, plot_2d_url: str = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    vs_json = json.dumps(visual_summary) if visual_summary else None
    c.execute('''
        INSERT INTO messages 
        (session_id, role, content, is_action, visual_summary, download_url, plot_1d_url, plot_2d_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (session_id, role, content, is_action, vs_json, download_url, plot_1d_url, plot_2d_url))
    conn.commit()
    conn.close()

def get_sessions():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT session_id, title, filename, created_at FROM sessions ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_session_messages(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC", (session_id,))
    rows = c.fetchall()
    conn.close()
    
    messages = []
    for row in rows:
        d = dict(row)
        if d['visual_summary']:
            d['visual_summary'] = json.loads(d['visual_summary'])
        d['is_action'] = bool(d['is_action'])
        messages.append(d)
    return messages

# Initialize upon import
init_db()
