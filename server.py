#!/usr/bin/env python3
import csv
import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import smtplib
import socket
from datetime import date, datetime, timedelta, timezone
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib import error as urllib_error
from urllib import request as urllib_request
from urllib.parse import parse_qs, urlparse

import openpyxl
import stripe
import xlrd
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from contact_importer import OUTPUT_HEADERS, process_uploads
from file_compressor import compress_upload


HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8080"))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "app.db"))
SESSION_COOKIE_NAME = "cdc_session"
SESSION_TTL_DAYS = 30
PASSWORD_ITERATIONS = 200_000
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "").strip()
APP_BASE_URL = os.environ.get("APP_BASE_URL", "").strip()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-5-mini").strip() or "gpt-5-mini"
SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "").strip()
ADMIN_EMAILS = {item.strip().lower() for item in os.environ.get("ADMIN_EMAILS", "").split(",") if item.strip()}
MAX_REQUEST_BODY_MB = float(os.environ.get("MAX_REQUEST_BODY_MB", "110"))
MAX_CONTACT_FILE_MB = float(os.environ.get("MAX_CONTACT_FILE_MB", "8"))
MAX_COMPRESS_FILE_MB = float(os.environ.get("MAX_COMPRESS_FILE_MB", "100"))
OPENAI_WEB_SEARCH_ENABLED = os.environ.get("OPENAI_ENABLE_WEB_SEARCH", "1").strip().lower() not in {"0", "false", "no"}
OPENAI_WEB_SEARCH_TOOL = os.environ.get("OPENAI_WEB_SEARCH_TOOL", "web_search_preview").strip() or "web_search_preview"
OPENAI_WEB_SEARCH_RUNTIME_DISABLED = False
MAX_AI_IMAGE_MB = float(os.environ.get("MAX_AI_IMAGE_MB", "10"))
PROMPT_VERSION = "unifyo-sk-fin-v4"

MAX_REQUEST_BODY_BYTES = max(1, int(MAX_REQUEST_BODY_MB * 1024 * 1024))
MAX_CONTACT_FILE_BYTES = max(1, int(MAX_CONTACT_FILE_MB * 1024 * 1024))
MAX_COMPRESS_FILE_BYTES = max(1, int(MAX_COMPRESS_FILE_MB * 1024 * 1024))
MAX_AI_IMAGE_BYTES = max(1, int(MAX_AI_IMAGE_MB * 1024 * 1024))

stripe.api_key = STRIPE_SECRET_KEY


def utc_now():
    return datetime.now(timezone.utc)


def format_timestamp(value):
    if isinstance(value, str):
        return value
    if not value:
        return ""
    return value.astimezone(timezone.utc).isoformat()


def parse_timestamp(value):
    if not value:
        return None
    return datetime.fromisoformat(value)


def get_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    connection = get_db()
    try:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                stripe_customer_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS memberships (
                user_id INTEGER PRIMARY KEY,
                status TEXT NOT NULL,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                current_period_end TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS checkout_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                stripe_session_id TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                used_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                event_type TEXT NOT NULL,
                event_label TEXT NOT NULL,
                event_meta TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS assistant_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                client_name TEXT NOT NULL DEFAULT '',
                due_date TEXT NOT NULL DEFAULT '',
                priority TEXT NOT NULL DEFAULT 'medium',
                channel TEXT NOT NULL DEFAULT 'followup',
                details TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'open',
                completed_at TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS assistant_profiles (
                user_id INTEGER PRIMARY KEY,
                focus TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS assistant_threads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL DEFAULT 'Nový chat',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS assistant_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                thread_id INTEGER,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                meta_json TEXT NOT NULL DEFAULT '{}',
                review_status TEXT NOT NULL DEFAULT 'unreviewed',
                reviewed_by INTEGER,
                reviewed_at TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (thread_id) REFERENCES assistant_threads(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS assistant_upload_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'pending',
                attachment_name TEXT NOT NULL DEFAULT '',
                attachment_type TEXT NOT NULL DEFAULT '',
                attachment_base64 TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                uploaded_at TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)").fetchall()}
        if "name" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
        if "role" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
        assistant_message_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(assistant_messages)").fetchall()
        }
        if "thread_id" not in assistant_message_columns:
            connection.execute("ALTER TABLE assistant_messages ADD COLUMN thread_id INTEGER")
        if "meta_json" not in assistant_message_columns:
            connection.execute("ALTER TABLE assistant_messages ADD COLUMN meta_json TEXT NOT NULL DEFAULT '{}'")
        if "review_status" not in assistant_message_columns:
            connection.execute("ALTER TABLE assistant_messages ADD COLUMN review_status TEXT NOT NULL DEFAULT 'unreviewed'")
        if "reviewed_by" not in assistant_message_columns:
            connection.execute("ALTER TABLE assistant_messages ADD COLUMN reviewed_by INTEGER")
        if "reviewed_at" not in assistant_message_columns:
            connection.execute("ALTER TABLE assistant_messages ADD COLUMN reviewed_at TEXT NOT NULL DEFAULT ''")

        orphan_user_ids = [
            row["user_id"]
            for row in connection.execute(
                """
                SELECT DISTINCT user_id
                FROM assistant_messages
                WHERE thread_id IS NULL OR thread_id = 0
                """
            ).fetchall()
        ]
        for user_id in orphan_user_ids:
            now_value = format_timestamp(utc_now())
            cursor = connection.execute(
                """
                INSERT INTO assistant_threads (user_id, title, created_at, updated_at)
                VALUES (?, 'Starší chat', ?, ?)
                """,
                (user_id, now_value, now_value),
            )
            connection.execute(
                """
                UPDATE assistant_messages
                SET thread_id = ?
                WHERE user_id = ? AND (thread_id IS NULL OR thread_id = 0)
                """,
                (cursor.lastrowid, user_id),
            )
        connection.commit()
    finally:
        connection.close()


def normalize_email(email):
    return str(email or "").strip().lower()


def parse_positive_int(value, default=0):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed


def format_mb(size_bytes):
    return f"{size_bytes / (1024 * 1024):.2f} MB"


def safe_json_loads(value, default=None):
    if default is None:
        default = {}
    try:
        return json.loads(value or "")
    except Exception:
        return default


def today_iso():
    return datetime.now().astimezone().date().isoformat()


def is_admin_email(email):
    return normalize_email(email) in ADMIN_EMAILS


def can_manage_admin_tools(user_row):
    return bool(user_row) and user_row["role"] == "admin" and is_admin_email(user_row["email"])


def hash_password(password, salt):
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PASSWORD_ITERATIONS,
    ).hex()


def create_password_hash(password):
    salt = secrets.token_hex(16)
    password_hash = hash_password(password, salt)
    return salt, password_hash


def verify_password(password, salt, password_hash):
    return hmac.compare_digest(hash_password(password, salt), password_hash)


def hash_session_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_reset_link(token):
    base = APP_BASE_URL.rstrip("/") if APP_BASE_URL else ""
    return f"{base}/app.html?reset_token={token}"


def send_reset_email(to_email, name, token):
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_FROM_EMAIL):
        raise RuntimeError("SMTP nie je nakonfigurované pre obnovu hesla.")

    reset_link = build_reset_link(token)
    message = EmailMessage()
    message["Subject"] = "Obnova hesla - Unifyo"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = to_email
    greeting = name or to_email
    message.set_content(
        f"""Dobrý deň {greeting},

prišla nám žiadosť o obnovu hesla pre váš účet v Unifyo.

Pre nastavenie nového hesla otvorte tento odkaz:
{reset_link}

Platnosť odkazu je 30 minút.

Ak ste o obnovu hesla nežiadali, tento e-mail môžete ignorovať.
"""
    )

    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(message)
        return

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(message)


def send_contact_email(sender_name, sender_email, subject, message_text):
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_FROM_EMAIL):
        raise RuntimeError("SMTP nie je nakonfigurované pre kontaktný formulár.")

    message = EmailMessage()
    message["Subject"] = f"Unifyo kontakt: {subject}"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = SMTP_FROM_EMAIL
    message["Reply-To"] = sender_email
    message.set_content(
        f"""Nová správa z kontaktného formulára Unifyo

Meno / kontakt:
{sender_name}

E-mail:
{sender_email}

Predmet:
{subject}

Správa:
{message_text}
"""
    )

    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(message)
        return

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(message)


def require_json(handler):
    try:
        content_length = int(handler.headers.get("Content-Length", "0"))
        payload = json.loads(handler.rfile.read(content_length).decode("utf-8"))
    except Exception:
        raise ValueError("Neplatné JSON dáta.")
    return payload


def get_cookie_token(headers):
    cookie_header = headers.get("Cookie", "")
    if not cookie_header:
        return ""
    cookie = SimpleCookie()
    cookie.load(cookie_header)
    morsel = cookie.get(SESSION_COOKIE_NAME)
    return morsel.value if morsel else ""


def create_session(connection, user_id):
    token = secrets.token_urlsafe(32)
    now = utc_now()
    expires_at = now + timedelta(days=SESSION_TTL_DAYS)
    connection.execute(
        """
        INSERT INTO sessions (user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, hash_session_token(token), format_timestamp(expires_at), format_timestamp(now)),
    )
    connection.commit()
    return token, expires_at


def log_activity(connection, event_type, event_label, user_id=None, **meta):
    connection.execute(
        """
        INSERT INTO activity_logs (user_id, event_type, event_label, event_meta, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            user_id,
            event_type,
            event_label,
            json.dumps(meta, ensure_ascii=False),
            format_timestamp(utc_now()),
        ),
    )
    connection.commit()


def clear_session(connection, token):
    if not token:
        return
    connection.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_session_token(token),))
    connection.commit()


def get_session_user(connection, headers):
    token = get_cookie_token(headers)
    if not token:
        return None

    row = connection.execute(
        """
        SELECT users.*
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?
        """,
        (hash_session_token(token),),
    ).fetchone()
    if not row:
        return None

    session_row = connection.execute(
        "SELECT expires_at FROM sessions WHERE token_hash = ?",
        (hash_session_token(token),),
    ).fetchone()
    expires_at = parse_timestamp(session_row["expires_at"]) if session_row else None
    if not expires_at or expires_at <= utc_now():
        clear_session(connection, token)
        return None
    return row


def get_membership(connection, user_id):
    row = connection.execute(
        "SELECT * FROM memberships WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    if not row:
        return None
    membership = dict(row)
    membership["current_period_end"] = parse_timestamp(membership.get("current_period_end"))
    membership["created_at"] = parse_timestamp(membership.get("created_at"))
    return membership


def ensure_admin_role(connection, user_row):
    if not user_row:
        return user_row
    if user_row["role"] == "admin":
        return user_row
    if not is_admin_email(user_row["email"]):
        return user_row
    connection.execute(
        "UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?",
        (format_timestamp(utc_now()), user_row["id"]),
    )
    connection.commit()
    return connection.execute("SELECT * FROM users WHERE id = ?", (user_row["id"],)).fetchone()


def get_recent_activity(connection, user_id=None, limit=20):
    params = []
    query = """
        SELECT activity_logs.*, users.email AS user_email, users.name AS user_name
        FROM activity_logs
        LEFT JOIN users ON users.id = activity_logs.user_id
    """
    if user_id is not None:
        query += " WHERE activity_logs.user_id = ?"
        params.append(user_id)
    query += " ORDER BY activity_logs.created_at DESC LIMIT ?"
    params.append(limit)
    rows = connection.execute(query, tuple(params)).fetchall()
    activity = []
    for row in rows:
        try:
            meta = json.loads(row["event_meta"] or "{}")
        except Exception:
            meta = {}
        activity.append(
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "user_email": row["user_email"] or "",
                "user_name": row["user_name"] or "",
                "event_type": row["event_type"],
                "event_label": row["event_label"],
                "created_at": row["created_at"],
                "meta": meta,
            }
        )
    return activity


def row_to_task(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "client_name": row["client_name"] or "",
        "due_date": row["due_date"] or "",
        "priority": row["priority"] or "medium",
        "channel": row["channel"] or "followup",
        "details": row["details"] or "",
        "status": row["status"] or "open",
        "completed_at": row["completed_at"] or "",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def get_assistant_tasks(connection, user_id, include_done=True):
    query = """
        SELECT *
        FROM assistant_tasks
        WHERE user_id = ?
    """
    params = [user_id]
    if not include_done:
        query += " AND status != 'done'"
    query += """
        ORDER BY
            CASE priority
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                ELSE 2
            END,
            CASE
                WHEN due_date = '' THEN 1
                ELSE 0
            END,
            due_date ASC,
            created_at DESC
    """
    return [row_to_task(row) for row in connection.execute(query, tuple(params)).fetchall()]


def build_assistant_brief(tasks):
    today = today_iso()
    open_tasks = [task for task in tasks if task["status"] != "done"]
    done_tasks = [task for task in tasks if task["status"] == "done"]
    overdue = [task for task in open_tasks if task["due_date"] and task["due_date"] < today]
    due_today = [task for task in open_tasks if task["due_date"] == today]
    high_priority = [task for task in open_tasks if task["priority"] == "high"]

    counts = {
        "open_tasks": len(open_tasks),
        "due_today": len(due_today),
        "overdue": len(overdue),
        "completed": len(done_tasks),
        "high_priority": len(high_priority),
    }

    focus = []
    if overdue:
        focus.append(f"Najprv vybav {len(overdue)} omeškaných úloh.")
    if due_today:
        focus.append(f"Dnes máš {len(due_today)} úloh na follow-up alebo kontakt.")
    if high_priority:
        focus.append(f"Prioritu má {len(high_priority)} dôležitých klientskych krokov.")
    if not focus:
        focus.append("Dnes máš priestor pripraviť nové follow-upy a upratať pipeline.")

    suggestions = []
    top_tasks = open_tasks[:3]
    for task in top_tasks:
        client = task["client_name"] or "klienta"
        if task["channel"] == "email":
            suggestions.append({
                "title": f"E-mail follow-up: {client}",
                "body": f"Dobrý deň {client}, ozývam sa k nášmu poslednému kontaktu. Navrhujem krátke doplnenie podkladov a dohodnutie ďalšieho kroku ešte dnes.",
            })
        elif task["channel"] == "call":
            suggestions.append({
                "title": f"Call script: {client}",
                "body": f"Dnes kontaktuj {client} telefonicky, over stav rozpracovania a navrhni konkrétny termín ďalšieho kroku.",
            })
        else:
            suggestions.append({
                "title": f"Ďalší krok: {client}",
                "body": f"Skontroluj úlohu „{task['title']}“ a posuň klienta {client} do ďalšej fázy bez zbytočného odkladu.",
            })

    if not suggestions:
        suggestions.append({
            "title": "Denný štart",
            "body": "Začni kontrolou nových leadov, obnov termíny follow-upov a priprav si tri najdôležitejšie klientské kroky na dnes.",
        })

    return {
        "today": today,
        "counts": counts,
        "focus": focus,
        "suggestions": suggestions,
    }


def get_assistant_profile(connection, user_id):
    row = connection.execute(
        "SELECT * FROM assistant_profiles WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    if not row:
        return {"focus": "", "notes": ""}
    return {
        "focus": row["focus"] or "",
        "notes": row["notes"] or "",
        "updated_at": row["updated_at"] or "",
    }


def build_thread_title(message, language="sk"):
    text = " ".join(str(message or "").strip().split())
    if not text:
        return "New chat" if language == "en" else "Nový chat"
    text = re.sub(r"\[priložený obrázok:[^\]]+\]", "", text, flags=re.IGNORECASE).strip()
    if not text:
        return "New chat" if language == "en" else "Nový chat"
    first_sentence = re.split(r"[.!?\n]", text, maxsplit=1)[0].strip()
    first_sentence = re.sub(
        r"^(prosím|prosim|ahoj|dobrý deň|dobry den|čau|cau|hello|hi)\s*[,:-]*\s*",
        "",
        first_sentence,
        flags=re.IGNORECASE,
    ).strip()
    first_sentence = re.sub(
        r"^(priprav mi|napíš mi|napis mi|pomôž mi|pomoz mi|vyhodnoť|vyhodnot|vysvetli|navrhni|zhrň|zhrn|zjednoduš|zjednodus|preformuluj|napíš|napis)\s+",
        "",
        first_sentence,
        flags=re.IGNORECASE,
    ).strip()
    first_sentence = re.sub(
        r"^(prosím|prosim)\s+",
        "",
        first_sentence,
        flags=re.IGNORECASE,
    ).strip()
    first_sentence = first_sentence.rstrip(" .,;:-")
    generic_titles = {"", "ahoj", "dobrý deň", "dobry den", "čau", "cau", "hello", "hi"}
    if first_sentence.lower() in generic_titles or len(first_sentence) < 4:
        return "New chat" if language == "en" else "Nový chat"
    words = first_sentence.split()
    normalized = " ".join(words[:8]).strip()
    normalized = normalized[0].upper() + normalized[1:]
    return normalized[:68].rstrip(" .,;:-")


def create_assistant_thread(connection, user_id, title="Nový chat"):
    now_value = format_timestamp(utc_now())
    cursor = connection.execute(
        """
        INSERT INTO assistant_threads (user_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, title or "Nový chat", now_value, now_value),
    )
    connection.commit()
    return cursor.lastrowid


def get_assistant_threads(connection, user_id, limit=40):
    rows = connection.execute(
        """
        SELECT
            assistant_threads.*,
            (
                SELECT COUNT(*)
                FROM assistant_messages
                WHERE assistant_messages.thread_id = assistant_threads.id
            ) AS message_count,
            (
                SELECT content
                FROM assistant_messages
                WHERE assistant_messages.thread_id = assistant_threads.id
                ORDER BY assistant_messages.id DESC
                LIMIT 1
            ) AS last_message,
            (
                SELECT created_at
                FROM assistant_messages
                WHERE assistant_messages.thread_id = assistant_threads.id
                ORDER BY assistant_messages.id DESC
                LIMIT 1
            ) AS last_message_at
        FROM assistant_threads
        WHERE user_id = ?
        ORDER BY updated_at DESC, id DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "title": row["title"] or "Nový chat",
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "message_count": row["message_count"] or 0,
            "last_message": row["last_message"] or "",
            "last_message_at": row["last_message_at"] or "",
        }
        for row in rows
    ]


def get_latest_assistant_thread(connection, user_id):
    row = connection.execute(
        """
        SELECT *
        FROM assistant_threads
        WHERE user_id = ?
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    return row


def resolve_assistant_thread(connection, user_id, thread_id):
    if thread_id:
        row = connection.execute(
            "SELECT * FROM assistant_threads WHERE id = ? AND user_id = ?",
            (thread_id, user_id),
        ).fetchone()
        if row:
            return row
    return get_latest_assistant_thread(connection, user_id)


def get_assistant_messages(connection, user_id, thread_id=None, limit=24):
    resolved_thread = resolve_assistant_thread(connection, user_id, thread_id)
    if not resolved_thread:
        return []
    rows = connection.execute(
        """
        SELECT *
        FROM assistant_messages
        WHERE user_id = ? AND thread_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (user_id, resolved_thread["id"], limit),
    ).fetchall()
    messages = []
    for row in reversed(rows):
        messages.append(
            {
                "id": row["id"],
                "thread_id": row["thread_id"],
                "role": row["role"],
                "content": row["content"],
                "meta": safe_json_loads(row["meta_json"], {}),
                "review_status": row["review_status"] or "unreviewed",
                "reviewed_by": row["reviewed_by"] or 0,
                "reviewed_at": row["reviewed_at"] or "",
                "created_at": row["created_at"],
            }
        )
    return messages


def touch_assistant_thread(connection, thread_id, title=None):
    now_value = format_timestamp(utc_now())
    if title:
        connection.execute(
            "UPDATE assistant_threads SET title = ?, updated_at = ? WHERE id = ?",
            (title, now_value, thread_id),
        )
    else:
        connection.execute(
            "UPDATE assistant_threads SET updated_at = ? WHERE id = ?",
            (now_value, thread_id),
        )


def save_assistant_message(connection, user_id, thread_id, role, content, meta=None, language="sk"):
    review_status = "approved" if role == "user" else "unreviewed"
    meta_json = json.dumps(meta or {}, ensure_ascii=False)
    cursor = connection.execute(
        """
        INSERT INTO assistant_messages (user_id, thread_id, role, content, meta_json, review_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, thread_id, role, content, meta_json, review_status, format_timestamp(utc_now())),
    )
    if role == "user":
        thread_row = connection.execute("SELECT title FROM assistant_threads WHERE id = ?", (thread_id,)).fetchone()
        current_title = (thread_row["title"] if thread_row else "") or "Nový chat"
        next_title = build_thread_title(content, language=language)
        touch_assistant_thread(
            connection,
            thread_id,
            title=next_title if current_title in {"", "Nový chat", "New chat", "Starší chat"} else None,
        )
    else:
        touch_assistant_thread(connection, thread_id)
    connection.commit()
    return cursor.lastrowid


def get_admin_assistant_thread_detail(connection, user_id, thread_id=None, limit=80):
    thread_row = resolve_assistant_thread(connection, user_id, thread_id)
    if not thread_row:
        return {"thread": None, "messages": []}
    return {
        "thread": {
            "id": thread_row["id"],
            "title": thread_row["title"] or "Nový chat",
            "created_at": thread_row["created_at"],
            "updated_at": thread_row["updated_at"],
        },
        "messages": get_assistant_messages(connection, user_id, thread_row["id"], limit=limit),
    }


def refresh_assistant_profile_memory(connection, user_id):
    rows = connection.execute(
        """
        SELECT content, created_at
        FROM assistant_messages
        WHERE user_id = ? AND role = 'user'
        ORDER BY id DESC
        LIMIT 12
        """,
        (user_id,),
    ).fetchall()
    recent_topics = []
    for row in rows:
        title = build_thread_title(row["content"] or "", language="sk")
        if title in {"Nový chat", "New chat", "Starší chat"}:
            continue
        if title not in recent_topics:
            recent_topics.append(title)
    focus_value = recent_topics[0] if recent_topics else ""
    notes_value = " | ".join(recent_topics[:5])
    now_value = format_timestamp(utc_now())
    connection.execute(
        """
        INSERT INTO assistant_profiles (user_id, focus, notes, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            focus = excluded.focus,
            notes = excluded.notes,
            updated_at = excluded.updated_at
        """,
        (user_id, focus_value, notes_value, now_value),
    )
    connection.commit()


def build_openai_chat_messages(user_row, profile, history_messages, user_message, attachment=None, language="sk"):
    messages = [
        {
            "role": "system",
            "content": build_assistant_system_prompt(user_row, profile, language=language),
        }
    ]
    for message in history_messages[-10:]:
        role = "assistant" if message["role"] == "assistant" else "user"
        meta = message.get("meta") or {}
        attachment_preview = str(meta.get("attachment_preview") or "").strip()
        if role == "user" and attachment_preview:
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": message.get("content") or "Pozri priložený obrázok v predchádzajúcej správe."},
                        {"type": "image_url", "image_url": {"url": attachment_preview}},
                    ],
                }
            )
        else:
            messages.append(
                {
                    "role": role,
                    "content": message.get("content") or "",
                }
            )
    if attachment:
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_message or "Vyhodnoť priložený obrázok a poraď mi ďalší krok."},
                    {"type": "image_url", "image_url": {"url": attachment["data_url"]}},
                ],
            }
        )
    else:
        messages.append({"role": "user", "content": user_message})
    return messages


def extract_openai_response_text(payload):
    output_text = str(payload.get("output_text") or "").strip()
    if output_text:
        return output_text

    choices = payload.get("choices") or []
    if choices:
        message = choices[0].get("message") or {}
        content = message.get("content") or ""
        if isinstance(content, str) and content.strip():
            return content.strip()
        if isinstance(content, list):
            chunks = []
            for item in content:
                if isinstance(item, str) and item.strip():
                    chunks.append(item.strip())
                    continue
                if not isinstance(item, dict):
                    continue
                if item.get("type") in {"text", "output_text"}:
                    text_value = item.get("text") or item.get("value") or ""
                    if isinstance(text_value, dict):
                        text_value = text_value.get("value", "")
                    if text_value:
                        chunks.append(str(text_value).strip())
            if chunks:
                return "\n\n".join(chunks).strip()

    chunks = []
    for item in payload.get("output", []) or []:
        if isinstance(item, dict) and item.get("type") in {"output_text", "text"}:
            text_value = item.get("text") or item.get("value") or ""
            if isinstance(text_value, dict):
                text_value = text_value.get("value", "")
            if text_value:
                chunks.append(str(text_value).strip())
        for content in item.get("content", []) or []:
            content_type = content.get("type", "")
            if content_type in {"output_text", "text"}:
                text_value = content.get("text") or content.get("value") or ""
                if isinstance(text_value, dict):
                    text_value = text_value.get("value", "")
                if text_value:
                    chunks.append(str(text_value).strip())
    return "\n\n".join(chunk for chunk in chunks if chunk).strip()


def perform_openai_request(url, payload):
    request = urllib_request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        try:
            detail = exc.read().decode("utf-8")
        except Exception:
            detail = ""
        raise RuntimeError(f"OpenAI API chyba: {detail or exc.reason}") from exc
    except urllib_error.URLError as exc:
        raise RuntimeError(f"OpenAI API nie je dostupné: {exc.reason}") from exc


def build_image_data_url(content_type, content_bytes):
    encoded = base64.b64encode(content_bytes).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def normalize_attachment_name(value):
    return " ".join(str(value or "").strip().split())[:120].strip() or "obrazok"


def parse_assistant_attachment(form):
    attachment_entry = None
    for key in ("attachment", "image", "file"):
        if form.get(key):
            attachment_entry = form[key][0]
            break
    if not attachment_entry or not attachment_entry.get("content"):
        return None

    content_type = str(attachment_entry.get("content_type") or "").strip().lower()
    if not content_type.startswith("image/"):
        raise ValueError("AI aktuálne podporuje iba obrázky.")

    content_bytes = attachment_entry.get("content") or b""
    if len(content_bytes) > MAX_AI_IMAGE_BYTES:
        raise ValueError(f"Obrázok je príliš veľký. Maximum je {format_mb(MAX_AI_IMAGE_BYTES)}.")

    filename = normalize_attachment_name(attachment_entry.get("filename") or "obrazok")
    return {
        "filename": filename,
        "content_type": content_type,
        "content_bytes": content_bytes,
        "data_url": build_image_data_url(content_type, content_bytes),
    }


def create_assistant_upload_session(connection, user_id):
    token = secrets.token_urlsafe(24)
    created_at = utc_now()
    expires_at = created_at + timedelta(minutes=10)
    connection.execute(
        """
        INSERT INTO assistant_upload_sessions (
            user_id, token, status, attachment_name, attachment_type, attachment_base64, created_at, expires_at, uploaded_at
        ) VALUES (?, ?, 'pending', '', '', '', ?, ?, '')
        """,
        (user_id, token, format_timestamp(created_at), format_timestamp(expires_at)),
    )
    connection.commit()
    return {
        "token": token,
        "created_at": format_timestamp(created_at),
        "expires_at": format_timestamp(expires_at),
    }


def get_assistant_upload_session(connection, token):
    if not token:
        return None
    row = connection.execute(
        "SELECT * FROM assistant_upload_sessions WHERE token = ?",
        (str(token).strip(),),
    ).fetchone()
    if not row:
        return None
    expires_at = parse_timestamp(row["expires_at"])
    if not expires_at or expires_at < utc_now():
        return None
    return row


def save_assistant_upload_to_session(connection, token, attachment):
    if not attachment:
        raise ValueError("Chýba obrázok na nahratie.")
    encoded = base64.b64encode(attachment["content_bytes"]).decode("ascii")
    now_value = format_timestamp(utc_now())
    connection.execute(
        """
        UPDATE assistant_upload_sessions
        SET status = 'uploaded',
            attachment_name = ?,
            attachment_type = ?,
            attachment_base64 = ?,
            uploaded_at = ?
        WHERE token = ?
        """,
        (attachment["filename"], attachment["content_type"], encoded, now_value, token),
    )
    connection.commit()


def build_assistant_upload_payload(row):
    if not row:
        return {"status": "missing"}
    if row["status"] != "uploaded" or not row["attachment_base64"]:
        return {
            "status": row["status"] or "pending",
            "uploaded": False,
            "expires_at": row["expires_at"] or "",
        }
    content_type = row["attachment_type"] or "image/jpeg"
    data_url = f"data:{content_type};base64,{row['attachment_base64']}"
    return {
        "status": "uploaded",
        "uploaded": True,
        "attachment_name": row["attachment_name"] or "obrazok",
        "attachment_type": content_type,
        "attachment_preview": data_url,
        "expires_at": row["expires_at"] or "",
        "uploaded_at": row["uploaded_at"] or "",
    }


def build_assistant_system_prompt(user_row, profile, language="sk"):
    now_value = datetime.now().astimezone()
    today_value = now_value.strftime("%d.%m.%Y")
    time_value = now_value.strftime("%H:%M")
    brief = (profile or {}).get("brief") or {}
    counts = brief.get("counts") or {}
    focus = brief.get("focus") or []
    suggestions = brief.get("suggestions") or []
    focus_line = " | ".join(str(item).strip() for item in focus[:2] if str(item).strip())
    suggestion_line = " | ".join(str(item.get("title") or "").strip() for item in suggestions[:3] if str(item.get("title") or "").strip())
    stored_focus = str((profile or {}).get("focus") or "").strip()
    brief_summary_sk = (
        f"Interný denný kontext: otvorené úlohy {counts.get('open_tasks', 0)}, "
        f"dnes {counts.get('due_today', 0)}, omeškané {counts.get('overdue', 0)}, "
        f"vysoká priorita {counts.get('high_priority', 0)}."
    )
    brief_summary_en = (
        f"Internal day context: open tasks {counts.get('open_tasks', 0)}, "
        f"due today {counts.get('due_today', 0)}, overdue {counts.get('overdue', 0)}, "
        f"high priority {counts.get('high_priority', 0)}."
    )
    brief_append_sk = brief_summary_sk + " "
    if focus_line:
        brief_append_sk += f"Aktuálne fokusy dňa: {focus_line}. "
    if suggestion_line:
        brief_append_sk += f"Navrhované pracovné okruhy: {suggestion_line}. "
    if stored_focus:
        brief_append_sk += f"Uložený fokus používateľa: {stored_focus}. "

    brief_append_en = brief_summary_en + " "
    if focus_line:
        brief_append_en += f"Current focus cues: {focus_line}. "
    if suggestion_line:
        brief_append_en += f"Suggested work tracks: {suggestion_line}. "
    if stored_focus:
        brief_append_en += f"Stored user focus: {stored_focus}. "

    if language == "en":
        return (
            "You are Unifyo AI, a professional internal assistant for financial intermediaries working in Slovakia. "
            "Help with daily organisation, priorities, follow-ups, client communication, meeting prep, call scripts, emails, SMS, pipeline and operations. "
            "Always communicate in natural, concise, professional English, while keeping Slovak market context in mind. "
            "Internally evaluate: 1) user intent, 2) question type, 3) Slovak market context, 4) best response format. Never show this hidden process. "
            "Default response structure: 1) direct answer, 2) short explanation, 3) recommended next step if useful. "
            "Keep the first version concise and easy to use. People prefer less text. If more detail would help, end with a short sentence offering an extended version on request. "
            "Do not add sources automatically. Mention them only when genuinely useful, especially for regulatory or official topics. "
            "If a source is important, add only one minimalist final line in this exact style: Source: https://... "
            "Prefer official sources such as nbs.sk, slov-lex.sk, official financial institution sites and, when relevant, alanrampacek.sk or prosight.sk. "
            f"The current reference date and time are {today_value} {time_value}. If the user asks for the current date or time, answer directly from this reference. "
            "For time-sensitive topics, use the latest public information when technically available. "
            "Your default mode is work guidance for the user's day. Prefer helping with tasks, clients, follow-ups, priorities, objections, emails, meetings and next actions. "
            "If the user asks something outside work, answer briefly and helpfully, but then gently bring the conversation back to practical work support with one short follow-up such as: How can I help with your clients or today's tasks? "
            "When possible, anchor the answer in action: what to send, whom to call, what to prioritise, or what the next best step is. "
            "If the user asks for text, first provide the shortest useful version. Then offer an expanded version only on request. "
            "End many answers with one practical work-oriented question or suggestion, but do not sound repetitive or robotic. "
            "Do not invent facts. If uncertain, say so naturally and recommend verification. "
            "Do not provide binding legal, tax or regulated investment advice; suggest checking with compliance or a qualified expert. "
            "If the user attaches an image or screenshot, first evaluate it clearly and then suggest a next step. "
            "Do not use markdown asterisks or noisy formatting. Write in short paragraphs or simple bullets without markdown artefacts. "
            "If helpful, proactively offer a short email/SMS version or a concrete next step. "
            f"{brief_append_en}"
            f"The user's name is {user_row['name'] or user_row['email']}. "
            f"Use internal prompt version {PROMPT_VERSION}, but do not mention it unless necessary."
        )
    return (
        "Si Unifyo AI, profesionálny interný asistent pre finančných sprostredkovateľov na Slovensku. "
        "Pomáhaš s organizáciou dňa, prioritami, follow-upmi, klientskou komunikáciou, prípravou stretnutí, "
        "call scriptami, e-mailami, SMS správami, pipeline a každodennou operatívou. "
        "Komunikuj vždy po slovensky, prirodzene, vecne, profesionálne a prakticky. "
        "Najprv si interne (skryto) vyhodnoť otázku v krokoch: "
        "1) zámer používateľa, 2) typ otázky (praktická/odborná/obchodná/informačná), "
        "3) kontext slovenského trhu a použiteľnosť, 4) najlepší formát odpovede. "
        "Tento interný postup nikdy nevypisuj. Používateľovi ukáž iba finálnu odpoveď. "
        "Predvolený výstup drž v 3 častiach: "
        "1) Priama odpoveď, 2) Stručné vysvetlenie, 3) Odporúčaný ďalší krok (ak je vhodný). "
        "Prvú verziu odpovede drž stručnú a výstižnú, lebo ľudia nemajú radi veľa textu. "
        "Ak je vhodné doplniť viac detailov, ukonči odpoveď krátkou vetou, že môžeš doplniť rozšírenú verziu na požiadanie. "
        "Zdroje alebo odkazy neuvádzaj automaticky. Uveď ich len vtedy, keď sú skutočne potrebné "
        "alebo užitočné (najmä pri regulačných, právnych, dohľadových a oficiálnych témach). "
        "Ak je dôležité uviesť zdroj, daj na úplný koniec iba jeden minimalistický riadok v tvare: Zdroj: https://... "
        "Ak je vhodné odporučiť zdroj, preferuj oficiálne a dôveryhodné weby: nbs.sk, slov-lex.sk, "
        "oficiálne stránky finančných inštitúcií, prípadne podľa kontextu alanrampacek.sk a prosight.sk. "
        f"Aktuálny referenčný dátum a čas sú {today_value} {time_value}. Pri časovo citlivých témach (novinky, legislatíva, sadzby, zmeny pravidiel) "
        "Ak sa používateľ pýta priamo na aktuálny dátum alebo čas, odpovedz priamo z tohto referenčného dátumu a času a netvrď, že k nim nemáš prístup. "
        "pracuj s najnovšími verejne dostupnými informáciami, ak sú technicky dostupné. "
        "Tvoj predvolený režim je pomoc s pracovným dňom používateľa. Prirodzene smeruj odpovede k úlohám, klientom, follow-upom, prioritám, argumentácii, komunikácii a ďalšiemu kroku. "
        "Ak sa používateľ spýta mimo práce, odpovedz normálne a stručne, ale potom ho jemne vráť späť k praktickej pomoci otázkou alebo návrhom typu: Ako ti s tým viem pomôcť v práci dnes? Ktorý klient alebo úloha je teraz najdôležitejšia? "
        "Keď sa dá, odpoveď ukotvi do akcie: čo poslať, komu zavolať, čo vysvetliť klientovi, čo prioritizovať alebo aký je ďalší najlepší krok. "
        "Pri požiadavke na text najprv daj krátku použiteľnú verziu. Rozšírenú verziu ponúkni len na požiadanie. "
        "Veľa odpovedí ukonči jednou stručnou pracovnou otázkou alebo návrhom ďalšieho kroku, ale neopakuj sa mechanicky v každej odpovedi. "
        "Nevymýšľaj si fakty. Ak si neistý, povedz to prirodzene a navrhni overenie. "
        "Nedávaj záväzné právne, daňové ani regulované investičné odporúčania; pri takých otázkach "
        "odporuč overenie cez compliance alebo kvalifikovaného odborníka. "
        "Ak používateľ priloží obrázok alebo screenshot, najprv ho vecne vyhodnoť a potom odporuč konkrétny ďalší krok. "
        "Nepoužívaj markdown hviezdičky ani zbytočné formátovanie typu **text**. "
        "Píš čisto, priamo a štruktúrovane pomocou krátkych odsekov alebo jednoduchých bodov bez markdown artefaktov. "
        "Ak to pomôže používateľovi, proaktívne ponúkni krátku verziu do e-mailu/SMS alebo konkrétny ďalší krok. "
        f"{brief_append_sk}"
        f"Používateľ sa volá {user_row['name'] or user_row['email']}. "
        f"Používaj internú prompt verziu {PROMPT_VERSION}, ale túto informáciu bežne nevypisuj používateľovi."
    )


def should_use_openai_web_search(user_message):
    if not OPENAI_WEB_SEARCH_ENABLED or OPENAI_WEB_SEARCH_RUNTIME_DISABLED:
        return False
    text = str(user_message or "").strip().lower()
    if not text:
        return False
    time_sensitive_markers = (
        "dnes",
        "today",
        "aktuálne",
        "aktualne",
        "current",
        "najnov",
        "latest",
        "novinka",
        "novinky",
        "news",
        "zmena",
        "zmeny",
        "update",
        "updates",
        "platí",
        "plati",
        "od kedy",
        "since when",
        "sadzb",
        "rate",
        "rates",
        "nbs",
        "legislat",
        "law",
        "legal",
        "zákon",
        "zakon",
        "regul",
        "regulation",
        "vyhlášk",
        "vyhlask",
        "trh",
        "market",
        "úrok",
        "urok",
        "interest",
    )
    return any(marker in text for marker in time_sensitive_markers)


def call_openai_assistant(user_row, profile, history_messages, user_message, attachment=None, language="sk"):
    global OPENAI_WEB_SEARCH_RUNTIME_DISABLED
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY nie je nastavený, takže AI asistent zatiaľ nemôže odpovedať.")

    response_meta = {
        "prompt_version": PROMPT_VERSION,
        "model": OPENAI_MODEL,
        "used_web_search": False,
        "used_image": bool(attachment),
        "attachment_name": attachment["filename"] if attachment else "",
    }
    history_has_images = any(
        str((message.get("meta") or {}).get("attachment_preview") or "").strip()
        for message in history_messages[-10:]
        if message.get("role") == "user"
    )
    if history_has_images:
        response_meta["used_image"] = True

    if attachment or history_has_images:
        fallback_messages = build_openai_chat_messages(
            user_row,
            profile,
            history_messages,
            user_message,
            attachment=attachment,
            language=language,
        )
        fallback_payload = perform_openai_request(
            "https://api.openai.com/v1/chat/completions",
            {
                "model": "gpt-4.1-mini",
                "messages": fallback_messages,
                "temperature": 0.5,
                "max_tokens": 700,
            },
        )
        text = extract_openai_response_text(fallback_payload)
        if text:
            response_meta["model"] = "gpt-4.1-mini"
            return text, response_meta
        raise RuntimeError("AI asistent vrátil prázdnu odpoveď k priloženému obrázku.")

    input_messages = []
    for message in history_messages[-10:]:
        input_messages.append(
            {
                "role": "assistant" if message["role"] == "assistant" else "user",
                "content": message["content"],
            }
        )
    input_messages.append(
        {
            "role": "user",
            "content": user_message,
        }
    )

    payload_base = {
        "model": OPENAI_MODEL,
        "instructions": build_assistant_system_prompt(user_row, profile, language=language),
        "input": input_messages,
        "max_output_tokens": 500,
    }
    primary_error = ""
    response_attempts = []
    use_web_search = should_use_openai_web_search(user_message)
    if use_web_search:
        response_attempts.append({**payload_base, "tools": [{"type": OPENAI_WEB_SEARCH_TOOL}]})
    response_attempts.append(payload_base)

    for candidate_payload in response_attempts:
        try:
            primary_payload = perform_openai_request("https://api.openai.com/v1/responses", candidate_payload)
            text = extract_openai_response_text(primary_payload)
            if text:
                response_meta["used_web_search"] = bool("tools" in candidate_payload)
                response_meta["model"] = candidate_payload.get("model", OPENAI_MODEL)
                return text, response_meta
            primary_error = f"AI asistent vrátil prázdnu odpoveď. Stav: {primary_payload.get('status') or 'unknown'}."
        except RuntimeError as exc:
            primary_error = str(exc)
            if use_web_search and "tools" in candidate_payload:
                lowered = primary_error.lower()
                if (
                    "tool" in lowered
                    and ("unknown" in lowered or "unsupported" in lowered or "invalid" in lowered)
                ) or OPENAI_WEB_SEARCH_TOOL.lower() in lowered:
                    OPENAI_WEB_SEARCH_RUNTIME_DISABLED = True

    fallback_messages = [
        {
            "role": "system",
            "content": build_assistant_system_prompt(user_row, profile, language=language),
        }
    ]
    for message in history_messages[-8:]:
        fallback_messages.append(
            {
                "role": "assistant" if message["role"] == "assistant" else "user",
                "content": message["content"],
            }
        )
    fallback_messages.append({"role": "user", "content": user_message})

    fallback_payload = perform_openai_request(
        "https://api.openai.com/v1/chat/completions",
        {
            "model": "gpt-4.1-mini",
            "messages": fallback_messages,
            "temperature": 0.7,
            "max_tokens": 500,
        },
    )
    text = extract_openai_response_text(fallback_payload)
    if text:
        response_meta["model"] = "gpt-4.1-mini"
        return text, response_meta
    raise RuntimeError(primary_error or "AI asistent vrátil prázdnu odpoveď.")


def is_membership_active(membership):
    if not membership:
        return False
    if membership.get("status") not in {"active", "trialing"}:
        return False
    period_end = membership.get("current_period_end")
    if not period_end:
        return False
    return period_end > utc_now()


def user_payload(connection, user_row):
    membership = get_membership(connection, user_row["id"])
    period_end = membership.get("current_period_end") if membership else None
    membership_started = membership.get("created_at") if membership else None
    return {
        "authenticated": True,
        "user": {
            "id": user_row["id"],
            "name": user_row["name"],
            "email": user_row["email"],
            "role": user_row["role"],
            "is_admin": user_row["role"] == "admin",
            "can_manage_admin_tools": can_manage_admin_tools(user_row),
            "created_at": user_row["created_at"],
            "membership_active": is_membership_active(membership),
            "membership_status": membership.get("status") if membership else "inactive",
            "membership_valid_until": format_timestamp(period_end) if period_end else "",
            "membership_started_at": format_timestamp(membership_started) if membership_started else "",
        },
    }


def get_request_base_url(handler):
    if APP_BASE_URL:
        return APP_BASE_URL.rstrip("/")
    forwarded_proto = handler.headers.get("X-Forwarded-Proto")
    proto = forwarded_proto or ("https" if PORT == 443 else "http")
    host = handler.headers.get("X-Forwarded-Host") or handler.headers.get("Host") or f"127.0.0.1:{PORT}"
    return f"{proto}://{host}".rstrip("/")


def get_or_create_customer(connection, user_row):
    customer_id = user_row["stripe_customer_id"]
    if customer_id:
        return customer_id

    customer = stripe.Customer.create(
        email=user_row["email"],
        metadata={"user_id": str(user_row["id"])},
    )
    customer_id = customer["id"]
    now = format_timestamp(utc_now())
    connection.execute(
        "UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?",
        (customer_id, now, user_row["id"]),
    )
    connection.commit()
    return customer_id


def sync_membership_from_subscription(connection, subscription, fallback_user_id=None):
    customer_id = subscription.get("customer")
    subscription_id = subscription.get("id")
    status = subscription.get("status", "inactive")
    period_end_ts = subscription.get("current_period_end")
    period_end = datetime.fromtimestamp(period_end_ts, tz=timezone.utc) if period_end_ts else None
    now = format_timestamp(utc_now())

    user_row = None
    if customer_id:
        user_row = connection.execute(
            "SELECT * FROM users WHERE stripe_customer_id = ?",
            (customer_id,),
        ).fetchone()
    if not user_row and fallback_user_id:
        user_row = connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (fallback_user_id,),
        ).fetchone()
        if user_row and customer_id and user_row["stripe_customer_id"] != customer_id:
            connection.execute(
                "UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?",
                (customer_id, now, user_row["id"]),
            )

    if not user_row:
        return

    connection.execute(
        """
        INSERT INTO memberships (
            user_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            status = excluded.status,
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_subscription_id = excluded.stripe_subscription_id,
            current_period_end = excluded.current_period_end,
            updated_at = excluded.updated_at
        """,
        (
            user_row["id"],
            status,
            customer_id,
            subscription_id,
            format_timestamp(period_end) if period_end else "",
            now,
            now,
        ),
    )
    log_activity(
        connection,
        "membership_updated",
        "Členstvo bolo synchronizované zo Stripe.",
        user_row["id"],
        status=status,
        current_period_end=format_timestamp(period_end) if period_end else "",
    )
    connection.commit()


def sync_membership_for_user(connection, user_row):
    customer_id = user_row["stripe_customer_id"]
    if not customer_id or not STRIPE_SECRET_KEY:
        return

    subscriptions = stripe.Subscription.list(customer=customer_id, status="all", limit=20)
    subscription_data = subscriptions.get("data", [])
    if not subscription_data:
        return

    def priority(item):
        status = item.get("status", "")
        order = {
            "active": 0,
            "trialing": 1,
            "past_due": 2,
            "unpaid": 3,
            "canceled": 4,
            "incomplete": 5,
            "incomplete_expired": 6,
        }
        return (order.get(status, 99), -(item.get("created") or 0))

    selected = sorted(subscription_data, key=priority)[0]
    sync_membership_from_subscription(connection, selected, fallback_user_id=user_row["id"])


def normalize_cell(value):
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def infer_python_cell_type(value):
    if value is None:
        return "empty"
    if isinstance(value, datetime):
        return "datetime"
    if isinstance(value, date):
        return "date"
    if isinstance(value, (int, float)):
        return "number"
    return "text"


def table_from_csv(file_bytes):
    for encoding in ("utf-8-sig", "utf-8", "cp1250", "latin-1"):
        try:
            text = file_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("CSV sa nepodarilo dekódovať.")

    reader = csv.reader(io.StringIO(text), delimiter=detect_csv_delimiter(text))
    rows = [row for row in reader if any(normalize_cell(cell) for cell in row)]
    return table_from_rows(rows)


def detect_csv_delimiter(text):
    sample = text[:8192]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,\t|")
        if dialect and dialect.delimiter:
            return dialect.delimiter
    except csv.Error:
        pass

    lines = [line for line in sample.splitlines() if line.strip()][:20]
    if not lines:
        return ","

    candidates = [";", ",", "\t", "|"]
    best = ","
    best_score = -1
    for delimiter in candidates:
        counts = [line.count(delimiter) for line in lines]
        score = sum(counts) + sum(1 for count in counts if count > 0) * 2
        if score > best_score:
            best_score = score
            best = delimiter
    return best


def table_from_xlsx(file_bytes):
    workbook = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    sheet = workbook[workbook.sheetnames[0]]
    rows = []
    row_types = []
    for row in sheet.iter_rows():
        values = []
        types = []
        for cell in row:
            values.append(normalize_cell(cell.value))
            if cell.is_date:
                types.append("datetime")
            else:
                types.append(infer_python_cell_type(cell.value))
        rows.append(values)
        row_types.append(types)
    return table_from_rows(rows, row_types)


def table_from_xls(file_bytes):
    workbook = xlrd.open_workbook(file_contents=file_bytes)
    sheet = workbook.sheet_by_index(0)
    rows = []
    row_types = []
    for row_index in range(sheet.nrows):
        current_row = []
        current_types = []
        for column_index in range(sheet.ncols):
            cell = sheet.cell(row_index, column_index)
            current_row.append(normalize_cell(cell.value))
            if cell.ctype == xlrd.XL_CELL_DATE:
                current_types.append("datetime")
            elif cell.ctype == xlrd.XL_CELL_NUMBER:
                current_types.append("number")
            elif cell.ctype == xlrd.XL_CELL_EMPTY:
                current_types.append("empty")
            else:
                current_types.append("text")
        rows.append(current_row)
        row_types.append(current_types)
    return table_from_rows(rows, row_types)


def table_from_rows(rows, row_types=None):
    if not rows:
        raise ValueError("Súbor je prázdny.")

    header_row = rows[0]
    headers = []
    for index, value in enumerate(header_row):
        label = normalize_cell(value) or f"Stĺpec {index + 1}"
        headers.append(label)

    structured_rows = []
    structured_types = []
    for row in rows[1:]:
        padded = list(row) + [""] * max(0, len(headers) - len(row))
        structured_rows.append([normalize_cell(padded[index]) for index in range(len(headers))])
    if row_types:
        for row in row_types[1:]:
            padded_types = list(row) + ["empty"] * max(0, len(headers) - len(row))
            structured_types.append([padded_types[index] for index in range(len(headers))])
    else:
        structured_types = [["text" if cell else "empty" for cell in row] for row in structured_rows]

    filtered_rows = []
    filtered_types = []
    for index, row in enumerate(structured_rows):
        if any(cell for cell in row):
            filtered_rows.append(row)
            filtered_types.append(structured_types[index])

    return {
        "headers": headers,
        "rows": filtered_rows,
        "types": filtered_types,
    }


def parse_multipart_form(headers, body):
    content_type = headers.get("Content-Type", "")
    if "multipart/form-data" not in content_type.lower():
        raise ValueError("Požiadavka musí byť multipart/form-data.")

    raw_message = (
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8")
        + body
    )
    message = BytesParser(policy=policy.default).parsebytes(raw_message)

    fields = {}
    for part in message.iter_parts():
        if part.get_content_disposition() != "form-data":
            continue

        name = part.get_param("name", header="content-disposition")
        if not name:
            continue

        entry = {
            "filename": part.get_filename(),
            "content": part.get_payload(decode=True) or b"",
            "content_type": part.get_content_type(),
        }
        fields.setdefault(name, []).append(entry)

    return fields


def reject_large_upload(handler, file_size, limit_bytes, label):
    if file_size <= limit_bytes:
        return False
    handler.write_json(
        {
            "error": f"{label} je príliš veľký. Maximum je {format_mb(limit_bytes)}."
        },
        status=HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
    )
    return True


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/ads.txt":
            self.handle_ads_txt()
            return
        if self.path.startswith("/api/me"):
            self.handle_me()
            return
        if self.path.startswith("/api/account"):
            self.handle_account()
            return
        if self.path.startswith("/api/contact-status"):
            self.handle_contact_status()
            return
        if self.path.startswith("/api/assistant-mobile-upload-status"):
            self.handle_assistant_mobile_upload_status()
            return
        if self.path.startswith("/api/assistant"):
            self.handle_assistant()
            return
        if self.path.startswith("/api/admin/user-detail"):
            self.handle_admin_user_detail()
            return
        if self.path.startswith("/api/admin/overview"):
            self.handle_admin_overview()
            return
        if self.path.startswith("/api/refresh-membership"):
            self.handle_refresh_membership()
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/register":
            self.handle_register()
            return
        if self.path == "/api/login":
            self.handle_login()
            return
        if self.path == "/api/request-password-reset":
            self.handle_request_password_reset()
            return
        if self.path == "/api/reset-password":
            self.handle_reset_password()
            return
        if self.path == "/api/logout":
            self.handle_logout()
            return
        if self.path == "/api/account/update":
            self.handle_account_update()
            return
        if self.path == "/api/account/change-password":
            self.handle_account_change_password()
            return
        if self.path == "/api/contact":
            self.handle_contact()
            return
        if self.path == "/api/assistant/thread":
            self.handle_assistant_thread()
            return
        if self.path == "/api/assistant/chat":
            self.handle_assistant_chat()
            return
        if self.path == "/api/assistant-mobile-upload-session":
            self.handle_assistant_mobile_upload_session()
            return
        if self.path == "/api/assistant-mobile-upload":
            self.handle_assistant_mobile_upload()
            return
        if self.path == "/api/assistant/profile":
            self.handle_assistant_profile()
            return
        if self.path == "/api/assistant/tasks":
            self.handle_assistant_tasks()
            return
        if self.path == "/api/admin/assistant-review":
            self.handle_admin_assistant_review()
            return
        if self.path == "/api/admin/assistant-memory-reset":
            self.handle_admin_assistant_memory_reset()
            return
        if self.path == "/api/create-checkout-session":
            self.handle_create_checkout_session()
            return
        if self.path == "/api/admin/membership":
            self.handle_admin_membership_update()
            return
        if self.path == "/api/admin/role":
            self.handle_admin_role_update()
            return
        if self.path == "/api/stripe-webhook":
            self.handle_stripe_webhook()
            return
        if self.path == "/api/process":
            self.handle_process()
            return
        if self.path == "/api/parse":
            self.handle_parse()
            return
        if self.path == "/api/compress-file":
            self.handle_compress_file()
            return
        if self.path == "/api/export-xlsx":
            self.handle_export_xlsx()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint neexistuje.")

    def read_request_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("Neplatná Content-Length hlavička.")
        if content_length <= 0:
            raise ValueError("Požiadavka neobsahuje žiadne dáta.")
        if content_length > MAX_REQUEST_BODY_BYTES:
            raise ValueError(f"Požiadavka je príliš veľká. Maximum je {format_mb(MAX_REQUEST_BODY_BYTES)}.")
        return self.rfile.read(content_length)

    def write_json(self, payload, status=HTTPStatus.OK, cookie_headers=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie_headers:
            for value in cookie_headers:
                self.send_header("Set-Cookie", value)
        self.end_headers()
        self.wfile.write(body)

    def handle_ads_txt(self):
        ads_path = os.path.join(BASE_DIR, "public", "ads.txt")
        if not os.path.exists(ads_path):
            self.send_error(HTTPStatus.NOT_FOUND, "ads.txt neexistuje.")
            return
        with open(ads_path, "rb") as handle:
            body = handle.read()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def is_secure_request(self):
        if APP_BASE_URL.startswith("https://"):
            return True
        forwarded_proto = self.headers.get("X-Forwarded-Proto", "")
        return forwarded_proto.lower() == "https"

    def session_cookie_header(self, token, expires_at):
        secure_flag = " Secure;" if self.is_secure_request() else ""
        return (
            f"{SESSION_COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax;{secure_flag} Max-Age={SESSION_TTL_DAYS * 24 * 60 * 60}; "
            f"Expires={expires_at.astimezone(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')}"
        )

    def expired_session_cookie_header(self):
        secure_flag = " Secure;" if self.is_secure_request() else ""
        return (
            f"{SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax;{secure_flag} Max-Age=0; "
            "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
        )

    def handle_me(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"authenticated": False, "user": None})
                return
            user = ensure_admin_role(connection, user)
            try:
                sync_membership_for_user(connection, user)
                user = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            except Exception:
                pass
            self.write_json(user_payload(connection, user))
        finally:
            connection.close()

    def require_authenticated_user(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return None
            return dict(user)
        finally:
            connection.close()

    def handle_account(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            user = ensure_admin_role(connection, user)
            try:
                sync_membership_for_user(connection, user)
                user = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            except Exception:
                pass
            self.write_json(
                {
                    **user_payload(connection, user),
                    "activity": get_recent_activity(connection, user["id"], limit=25),
                }
            )
        finally:
            connection.close()

    def handle_contact_status(self):
        self.write_json(
            {
                "configured": bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_FROM_EMAIL),
                "reply_to": SMTP_FROM_EMAIL or "",
            }
        )

    def handle_contact(self):
        try:
            payload = require_json(self)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        contact_name = str(payload.get("contact_name") or "").strip()
        contact_email = normalize_email(payload.get("contact_email"))
        subject = str(payload.get("subject") or "").strip()
        message_text = str(payload.get("message") or "").strip()

        if len(contact_name) < 2:
            self.write_json({"error": "Zadajte meno alebo kontakt."}, status=HTTPStatus.BAD_REQUEST)
            return
        if not contact_email or "@" not in contact_email:
            self.write_json({"error": "Zadajte platný e-mail."}, status=HTTPStatus.BAD_REQUEST)
            return
        if len(subject) < 3:
            self.write_json({"error": "Zadajte predmet správy."}, status=HTTPStatus.BAD_REQUEST)
            return
        if len(message_text) < 10:
            self.write_json({"error": "Správa je príliš krátka."}, status=HTTPStatus.BAD_REQUEST)
            return

        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            send_contact_email(contact_name, contact_email, subject, message_text)
            log_activity(
                connection,
                "contact_form_sent",
                "Používateľ odoslal kontaktný formulár.",
                user["id"] if user else None,
                contact_email=contact_email,
                subject=subject,
            )
            self.write_json({"ok": True})
        except RuntimeError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        except smtplib.SMTPException:
            self.write_json({"error": "Kontaktnú správu sa nepodarilo odoslať."}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        finally:
            connection.close()

    def handle_assistant_mobile_upload_session(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            membership = get_membership(connection, user["id"])
            if not is_membership_active(membership):
                self.write_json({"error": "Na použitie AI asistenta je potrebné aktívne členstvo."}, status=HTTPStatus.PAYMENT_REQUIRED)
                return
            upload_session = create_assistant_upload_session(connection, user["id"])
            base_url = get_request_base_url(self)
            upload_url = f"{base_url}/ai-mobile-upload.html?token={upload_session['token']}"
            self.write_json(
                {
                    "ok": True,
                    "token": upload_session["token"],
                    "upload_url": upload_url,
                    "expires_at": upload_session["expires_at"],
                }
            )
        finally:
            connection.close()

    def handle_assistant_mobile_upload_status(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            params = parse_qs(urlparse(self.path).query)
            token = str((params.get("token") or [""])[0]).strip()
            if not token:
                self.write_json({"error": "Chýba token uploadu."}, status=HTTPStatus.BAD_REQUEST)
                return
            row = get_assistant_upload_session(connection, token)
            if not row:
                self.write_json({"error": "Upload session neexistuje alebo vypršala."}, status=HTTPStatus.NOT_FOUND)
                return
            if row["user_id"] != user["id"]:
                self.write_json({"error": "K tejto upload session nemáte prístup."}, status=HTTPStatus.FORBIDDEN)
                return
            self.write_json({"ok": True, **build_assistant_upload_payload(row)})
        finally:
            connection.close()

    def handle_assistant_mobile_upload(self):
        connection = get_db()
        try:
            form = parse_multipart_form(self.headers, self.read_request_body())
            token = ""
            if form.get("token"):
                token = (form["token"][0].get("content") or b"").decode("utf-8", errors="ignore").strip()
            if not token:
                self.write_json({"error": "Chýba token uploadu."}, status=HTTPStatus.BAD_REQUEST)
                return
            upload_session = get_assistant_upload_session(connection, token)
            if not upload_session:
                self.write_json({"error": "Upload session neexistuje alebo vypršala."}, status=HTTPStatus.NOT_FOUND)
                return
            attachment = parse_assistant_attachment(form)
            save_assistant_upload_to_session(connection, token, attachment)
            self.write_json({"ok": True, **build_assistant_upload_payload(get_assistant_upload_session(connection, token))})
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        finally:
            connection.close()

    def handle_assistant(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            membership = get_membership(connection, user["id"])
            if not is_membership_active(membership):
                self.write_json({"error": "Na použitie AI asistenta je potrebné aktívne členstvo."}, status=HTTPStatus.PAYMENT_REQUIRED)
                return

            params = parse_qs(urlparse(self.path).query)
            requested_thread_id = parse_positive_int((params.get("thread_id") or ["0"])[0], 0)
            active_thread = resolve_assistant_thread(connection, user["id"], requested_thread_id)
            threads = get_assistant_threads(connection, user["id"], limit=50)

            self.write_json(
                {
                    "profile": get_assistant_profile(connection, user["id"]),
                    "threads": threads,
                    "active_thread_id": active_thread["id"] if active_thread else 0,
                    "messages": get_assistant_messages(connection, user["id"], active_thread["id"], limit=80) if active_thread else [],
                }
            )
        finally:
            connection.close()

    def handle_admin_overview(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            user = ensure_admin_role(connection, user)
            if user["role"] != "admin":
                self.write_json({"error": "Nemáte prístup do administrácie."}, status=HTTPStatus.FORBIDDEN)
                return

            rows = connection.execute(
                """
                SELECT users.*, memberships.status AS membership_status, memberships.current_period_end AS membership_valid_until
                FROM users
                LEFT JOIN memberships ON memberships.user_id = users.id
                ORDER BY users.created_at DESC
                """
            ).fetchall()
            users = []
            for row in rows:
                users.append(
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "email": row["email"],
                        "role": row["role"],
                        "created_at": row["created_at"],
                        "membership_status": row["membership_status"] or "inactive",
                        "membership_valid_until": row["membership_valid_until"] or "",
                    }
                )
            threshold = format_timestamp(utc_now() - timedelta(days=30))
            stats = {
                "total_users": len(users),
                "active_memberships": sum(1 for item in users if item["membership_status"] == "active"),
                "admin_users": sum(1 for item in users if item["role"] == "admin"),
                "recent_registrations": connection.execute(
                    "SELECT COUNT(*) AS total FROM users WHERE created_at >= ?",
                    (threshold,),
                ).fetchone()["total"],
            }
            self.write_json({"users": users, "activity": get_recent_activity(connection, limit=50), "stats": stats})
        finally:
            connection.close()

    def handle_admin_user_detail(self):
        connection = get_db()
        try:
            admin_user = get_session_user(connection, self.headers)
            if not admin_user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            admin_user = ensure_admin_role(connection, admin_user)
            if admin_user["role"] != "admin":
                self.write_json({"error": "Nemáte prístup do administrácie."}, status=HTTPStatus.FORBIDDEN)
                return

            params = parse_qs(urlparse(self.path).query)
            user_id = parse_positive_int((params.get("user_id") or ["0"])[0], 0)
            if not user_id:
                self.write_json({"error": "Chýba ID používateľa."}, status=HTTPStatus.BAD_REQUEST)
                return

            row = connection.execute(
                """
                SELECT users.*, memberships.status AS membership_status, memberships.current_period_end AS membership_valid_until
                FROM users
                LEFT JOIN memberships ON memberships.user_id = users.id
                WHERE users.id = ?
                """,
                (user_id,),
            ).fetchone()
            if not row:
                self.write_json({"error": "Používateľ neexistuje."}, status=HTTPStatus.NOT_FOUND)
                return

            params = parse_qs(urlparse(self.path).query)
            requested_thread_id = parse_positive_int((params.get("thread_id") or ["0"])[0], 0)
            ai_threads = get_assistant_threads(connection, row["id"], limit=50)
            ai_thread_detail = get_admin_assistant_thread_detail(connection, row["id"], requested_thread_id, limit=80) if ai_threads else {"thread": None, "messages": []}

            self.write_json(
                {
                    "user": {
                        "id": row["id"],
                        "name": row["name"],
                        "email": row["email"],
                        "role": row["role"],
                        "created_at": row["created_at"],
                        "membership_status": row["membership_status"] or "inactive",
                        "membership_valid_until": row["membership_valid_until"] or "",
                    },
                    "activity": get_recent_activity(connection, user_id=row["id"], limit=25),
                    "ai_threads": ai_threads,
                    "ai_active_thread": ai_thread_detail["thread"],
                    "ai_messages": ai_thread_detail["messages"],
                }
            )
        finally:
            connection.close()

    def handle_refresh_membership(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            sync_membership_for_user(connection, user)
            user = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            self.write_json(user_payload(connection, user))
        except stripe.error.StripeError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)
        finally:
            connection.close()

    def handle_register(self):
        try:
            payload = require_json(self)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        name = str(payload.get("name") or "").strip()
        email = normalize_email(payload.get("email"))
        password = str(payload.get("password") or "")
        if len(name) < 2:
            self.write_json({"error": "Zadajte meno alebo názov používateľa."}, status=HTTPStatus.BAD_REQUEST)
            return
        if not email or "@" not in email:
            self.write_json({"error": "Zadajte platný e-mail."}, status=HTTPStatus.BAD_REQUEST)
            return
        if len(password) < 8:
            self.write_json({"error": "Heslo musí mať aspoň 8 znakov."}, status=HTTPStatus.BAD_REQUEST)
            return

        connection = get_db()
        try:
            existing = connection.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
            if existing:
                self.write_json({"error": "Účet s týmto e-mailom už existuje."}, status=HTTPStatus.CONFLICT)
                return

            salt, password_hash = create_password_hash(password)
            now = format_timestamp(utc_now())
            role = "admin" if is_admin_email(email) else "user"
            cursor = connection.execute(
                """
                INSERT INTO users (name, email, password_hash, password_salt, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (name, email, password_hash, salt, role, now, now),
            )
            user_id = cursor.lastrowid
            token, expires_at = create_session(connection, user_id)
            log_activity(connection, "register", "Používateľ si vytvoril účet.", user_id, email=email, role=role)
            user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            self.write_json(
                user_payload(connection, user),
                status=HTTPStatus.CREATED,
                cookie_headers=[self.session_cookie_header(token, expires_at)],
            )
        finally:
            connection.close()

    def handle_login(self):
        try:
            payload = require_json(self)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        email = normalize_email(payload.get("email"))
        password = str(payload.get("password") or "")
        connection = get_db()
        try:
            user = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if not user or not verify_password(password, user["password_salt"], user["password_hash"]):
                self.write_json({"error": "Neplatný e-mail alebo heslo."}, status=HTTPStatus.UNAUTHORIZED)
                return
            user = ensure_admin_role(connection, user)

            old_token = get_cookie_token(self.headers)
            clear_session(connection, old_token)
            token, expires_at = create_session(connection, user["id"])
            log_activity(connection, "login", "Používateľ sa prihlásil.", user["id"], email=email)
            self.write_json(
                user_payload(connection, user),
                cookie_headers=[self.session_cookie_header(token, expires_at)],
            )
        finally:
            connection.close()

    def handle_request_password_reset(self):
        try:
            payload = require_json(self)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        email = normalize_email(payload.get("email"))
        if not email:
            self.write_json({"error": "Zadajte e-mail."}, status=HTTPStatus.BAD_REQUEST)
            return

        connection = get_db()
        try:
            user = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if not user:
                self.write_json({"ok": True})
                return

            raw_token = secrets.token_urlsafe(32)
            token_hash = hash_session_token(raw_token)
            now = utc_now()
            expires_at = now + timedelta(minutes=30)
            connection.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user["id"],))
            connection.execute(
                """
                INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at, used_at)
                VALUES (?, ?, ?, ?, NULL)
                """,
                (user["id"], token_hash, format_timestamp(expires_at), format_timestamp(now)),
            )
            connection.commit()
            send_reset_email(user["email"], user["name"], raw_token)
            log_activity(connection, "password_reset_requested", "Používateľ si vyžiadal obnovu hesla.", user["id"])
            self.write_json({"ok": True})
        except RuntimeError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        except smtplib.SMTPAuthenticationError:
            self.write_json(
                {"error": "SMTP prihlásenie zlyhalo. Skontrolujte SMTP_USER a SMTP_PASSWORD."},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        except smtplib.SMTPException:
            self.write_json(
                {"error": "Odoslanie reset e-mailu zlyhalo na SMTP serveri."},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        except (TimeoutError, socket.timeout):
            self.write_json(
                {"error": "SMTP server neodpovedá. Skontrolujte SMTP_HOST a SMTP_PORT."},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            self.write_json({"error": f"Reset e-mail sa nepodarilo odoslať: {exc}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        finally:
            connection.close()

    def handle_reset_password(self):
        try:
            payload = require_json(self)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        token = str(payload.get("token") or "").strip()
        password = str(payload.get("password") or "")
        if len(password) < 8:
            self.write_json({"error": "Nové heslo musí mať aspoň 8 znakov."}, status=HTTPStatus.BAD_REQUEST)
            return
        if not token:
            self.write_json({"error": "Chýba token obnovy hesla."}, status=HTTPStatus.BAD_REQUEST)
            return

        connection = get_db()
        try:
            token_row = connection.execute(
                "SELECT * FROM password_reset_tokens WHERE token_hash = ?",
                (hash_session_token(token),),
            ).fetchone()
            if not token_row:
                self.write_json({"error": "Reset link je neplatný."}, status=HTTPStatus.BAD_REQUEST)
                return
            if token_row["used_at"]:
                self.write_json({"error": "Reset link už bol použitý."}, status=HTTPStatus.BAD_REQUEST)
                return
            if parse_timestamp(token_row["expires_at"]) <= utc_now():
                self.write_json({"error": "Reset link už vypršal."}, status=HTTPStatus.BAD_REQUEST)
                return

            salt, password_hash = create_password_hash(password)
            now = format_timestamp(utc_now())
            connection.execute(
                "UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?",
                (password_hash, salt, now, token_row["user_id"]),
            )
            connection.execute(
                "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?",
                (now, token_row["id"]),
            )
            connection.execute("DELETE FROM sessions WHERE user_id = ?", (token_row["user_id"],))
            connection.commit()
            log_activity(connection, "password_reset_completed", "Používateľ si obnovil heslo.", token_row["user_id"])
            self.write_json({"ok": True})
        finally:
            connection.close()

    def handle_account_update(self):
        try:
            payload = require_json(self)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return

            name = str(payload.get("name") or "").strip()
            email = normalize_email(payload.get("email"))
            if len(name) < 2:
                self.write_json({"error": "Zadajte meno alebo názov používateľa."}, status=HTTPStatus.BAD_REQUEST)
                return
            if not email or "@" not in email:
                self.write_json({"error": "Zadajte platný e-mail."}, status=HTTPStatus.BAD_REQUEST)
                return

            existing = connection.execute(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                (email, user["id"]),
            ).fetchone()
            if existing:
                self.write_json({"error": "Tento e-mail už používa iný účet."}, status=HTTPStatus.CONFLICT)
                return

            role = user["role"]
            connection.execute(
                "UPDATE users SET name = ?, email = ?, role = ?, updated_at = ? WHERE id = ?",
                (name, email, role, format_timestamp(utc_now()), user["id"]),
            )
            connection.commit()
            log_activity(connection, "account_updated", "Používateľ upravil svoj účet.", user["id"], email=email)
            updated = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            self.write_json({**user_payload(connection, updated), "activity": get_recent_activity(connection, updated["id"], limit=25)})
        finally:
            connection.close()

    def handle_account_change_password(self):
        try:
            payload = require_json(self)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        current_password = str(payload.get("current_password") or "")
        new_password = str(payload.get("new_password") or "")
        if len(new_password) < 8:
            self.write_json({"error": "Nové heslo musí mať aspoň 8 znakov."}, status=HTTPStatus.BAD_REQUEST)
            return

        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            if not verify_password(current_password, user["password_salt"], user["password_hash"]):
                self.write_json({"error": "Aktuálne heslo nie je správne."}, status=HTTPStatus.BAD_REQUEST)
                return

            salt, password_hash = create_password_hash(new_password)
            connection.execute(
                "UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?",
                (password_hash, salt, format_timestamp(utc_now()), user["id"]),
            )
            connection.commit()
            log_activity(connection, "password_changed", "Používateľ zmenil heslo v účte.", user["id"])
            self.write_json({"ok": True})
        finally:
            connection.close()

    def handle_assistant_profile(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            membership = get_membership(connection, user["id"])
            if not is_membership_active(membership):
                self.write_json({"error": "Na použitie AI asistenta je potrebné aktívne členstvo."}, status=HTTPStatus.PAYMENT_REQUIRED)
                return

            log_activity(connection, "assistant_profile_checked", "Používateľ otvoril nastavenie AI profilu.", user["id"])
            self.write_json({"ok": True, "profile": get_assistant_profile(connection, user["id"])})
        finally:
            connection.close()

    def handle_assistant_thread(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            membership = get_membership(connection, user["id"])
            if not is_membership_active(membership):
                self.write_json({"error": "Na použitie AI asistenta je potrebné aktívne členstvo."}, status=HTTPStatus.PAYMENT_REQUIRED)
                return

            payload = require_json(self)
            action = str(payload.get("action") or "create").strip().lower()
            language = "en" if str(payload.get("lang") or "").strip().lower() == "en" else "sk"

            if action == "rename":
                thread_id = parse_positive_int(payload.get("thread_id"), 0)
                title = build_thread_title(payload.get("title") or ("New chat" if language == "en" else "Nový chat"), language=language)
                active_thread = resolve_assistant_thread(connection, user["id"], thread_id)
                if not active_thread:
                    self.write_json({"error": "Chat sa nenašiel."}, status=HTTPStatus.NOT_FOUND)
                    return
                touch_assistant_thread(connection, active_thread["id"], title=title)
                connection.commit()
                active_thread = resolve_assistant_thread(connection, user["id"], active_thread["id"])
                log_activity(connection, "assistant_thread_renamed", "Používateľ premenoval AI chat.", user["id"], thread_id=active_thread["id"], title=title)
                self.write_json(
                    {
                        "ok": True,
                        "thread": {
                            "id": active_thread["id"],
                            "title": active_thread["title"] or "Nový chat",
                            "created_at": active_thread["created_at"],
                            "updated_at": active_thread["updated_at"],
                        },
                        "threads": get_assistant_threads(connection, user["id"], limit=50),
                        "messages": get_assistant_messages(connection, user["id"], active_thread["id"], limit=80),
                    }
                )
                return

            title = build_thread_title(payload.get("title") or ("New chat" if language == "en" else "Nový chat"), language=language)
            thread_id = create_assistant_thread(connection, user["id"], title)
            active_thread = resolve_assistant_thread(connection, user["id"], thread_id)
            log_activity(connection, "assistant_thread_created", "Používateľ založil nový AI chat.", user["id"], thread_id=thread_id)
            self.write_json(
                {
                    "ok": True,
                    "thread": {
                        "id": active_thread["id"],
                        "title": active_thread["title"] or "Nový chat",
                        "created_at": active_thread["created_at"],
                        "updated_at": active_thread["updated_at"],
                    },
                    "threads": get_assistant_threads(connection, user["id"], limit=50),
                    "messages": [],
                }
            )
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        finally:
            connection.close()

    def handle_assistant_chat(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            membership = get_membership(connection, user["id"])
            if not is_membership_active(membership):
                self.write_json({"error": "Na použitie AI asistenta je potrebné aktívne členstvo."}, status=HTTPStatus.PAYMENT_REQUIRED)
                return

            content_type = self.headers.get("Content-Type", "")
            attachment = None
            if "multipart/form-data" in content_type.lower():
                form = parse_multipart_form(self.headers, self.read_request_body())
                message = ""
                language = "sk"
                if form.get("message"):
                    message = (form["message"][0].get("content") or b"").decode("utf-8", errors="ignore").strip()
                thread_id = 0
                if form.get("thread_id"):
                    thread_id = parse_positive_int((form["thread_id"][0].get("content") or b"").decode("utf-8", errors="ignore").strip(), 0)
                if form.get("lang"):
                    language = "en" if ((form["lang"][0].get("content") or b"").decode("utf-8", errors="ignore").strip().lower() == "en") else "sk"
                attachment = parse_assistant_attachment(form)
            else:
                payload = require_json(self)
                message = str(payload.get("message") or "").strip()
                thread_id = parse_positive_int(payload.get("thread_id"), 0)
                language = "en" if str(payload.get("lang") or "").strip().lower() == "en" else "sk"
            if len(message) < 2 and not attachment:
                self.write_json({"error": "Napíšte správu pre AI asistenta."}, status=HTTPStatus.BAD_REQUEST)
                return

            active_thread = resolve_assistant_thread(connection, user["id"], thread_id)
            if not active_thread:
                new_thread_id = create_assistant_thread(connection, user["id"], build_thread_title(message, language=language))
                active_thread = resolve_assistant_thread(connection, user["id"], new_thread_id)
            profile = get_assistant_profile(connection, user["id"])
            profile["brief"] = build_assistant_brief(get_assistant_tasks(connection, user["id"], include_done=True))
            history_messages = get_assistant_messages(connection, user["id"], active_thread["id"], limit=80)
            user_message_content = message
            user_meta = {}
            if attachment:
                base_user_message = message or "Vyhodnoť prosím priložený obrázok."
                user_message_content = base_user_message
                user_meta = {
                    "attachment_name": attachment["filename"],
                    "attachment_type": attachment["content_type"],
                    "attachment_preview": attachment["data_url"],
                }
            save_assistant_message(connection, user["id"], active_thread["id"], "user", user_message_content, meta=user_meta, language=language)
            reply, reply_meta = call_openai_assistant(user, profile, history_messages, message, attachment=attachment, language=language)
            save_assistant_message(connection, user["id"], active_thread["id"], "assistant", reply, meta=reply_meta, language=language)
            refresh_assistant_profile_memory(connection, user["id"])
            log_activity(
                connection,
                "assistant_chat_message",
                "Používateľ komunikoval s AI asistentom.",
                user["id"],
                thread_id=active_thread["id"],
                used_image=bool(attachment),
                attachment_name=attachment["filename"] if attachment else "",
            )
            self.write_json(
                {
                    "ok": True,
                    "threads": get_assistant_threads(connection, user["id"], limit=50),
                    "active_thread_id": active_thread["id"],
                    "messages": get_assistant_messages(connection, user["id"], active_thread["id"], limit=80),
                    "profile": profile,
                }
            )
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        except RuntimeError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)
        finally:
            connection.close()

    def handle_assistant_tasks(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            membership = get_membership(connection, user["id"])
            if not is_membership_active(membership):
                self.write_json({"error": "Na použitie AI asistenta je potrebné aktívne členstvo."}, status=HTTPStatus.PAYMENT_REQUIRED)
                return

            payload = require_json(self)
            action = str(payload.get("action") or "create").strip().lower()

            if action == "create":
                title = str(payload.get("title") or "").strip()
                client_name = str(payload.get("client_name") or "").strip()
                due_date = str(payload.get("due_date") or "").strip()
                priority = str(payload.get("priority") or "medium").strip().lower()
                channel = str(payload.get("channel") or "followup").strip().lower()
                details = str(payload.get("details") or "").strip()

                if len(title) < 3:
                    self.write_json({"error": "Zadajte názov úlohy."}, status=HTTPStatus.BAD_REQUEST)
                    return
                if priority not in {"high", "medium", "low"}:
                    priority = "medium"
                if channel not in {"followup", "email", "call", "meeting"}:
                    channel = "followup"

                now_value = format_timestamp(utc_now())
                connection.execute(
                    """
                    INSERT INTO assistant_tasks (
                        user_id, title, client_name, due_date, priority, channel, details, status, completed_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', '', ?, ?)
                    """,
                    (user["id"], title, client_name, due_date, priority, channel, details, now_value, now_value),
                )
                connection.commit()
                log_activity(connection, "assistant_task_created", "Používateľ pridal úlohu do AI asistenta.", user["id"], title=title, client_name=client_name, priority=priority)
                self.write_json({"ok": True})
                return

            task_id = parse_positive_int(payload.get("task_id"), 0)
            if not task_id:
                self.write_json({"error": "Chýba ID úlohy."}, status=HTTPStatus.BAD_REQUEST)
                return

            task_row = connection.execute(
                "SELECT * FROM assistant_tasks WHERE id = ? AND user_id = ?",
                (task_id, user["id"]),
            ).fetchone()
            if not task_row:
                self.write_json({"error": "Úloha neexistuje."}, status=HTTPStatus.NOT_FOUND)
                return

            if action == "complete":
                connection.execute(
                    "UPDATE assistant_tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?",
                    (format_timestamp(utc_now()), format_timestamp(utc_now()), task_id),
                )
                connection.commit()
                log_activity(connection, "assistant_task_completed", "Používateľ označil úlohu ako hotovú.", user["id"], task_id=task_id, title=task_row["title"])
                self.write_json({"ok": True})
                return

            if action == "reopen":
                connection.execute(
                    "UPDATE assistant_tasks SET status = 'open', completed_at = '', updated_at = ? WHERE id = ?",
                    (format_timestamp(utc_now()), task_id),
                )
                connection.commit()
                log_activity(connection, "assistant_task_reopened", "Používateľ znova otvoril úlohu.", user["id"], task_id=task_id, title=task_row["title"])
                self.write_json({"ok": True})
                return

            if action == "delete":
                connection.execute("DELETE FROM assistant_tasks WHERE id = ?", (task_id,))
                connection.commit()
                log_activity(connection, "assistant_task_deleted", "Používateľ vymazal úlohu z AI asistenta.", user["id"], task_id=task_id, title=task_row["title"])
                self.write_json({"ok": True})
                return

            self.write_json({"error": "Neplatná akcia pre AI asistenta."}, status=HTTPStatus.BAD_REQUEST)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        finally:
            connection.close()

    def handle_logout(self):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if user:
                log_activity(connection, "logout", "Používateľ sa odhlásil.", user["id"])
            clear_session(connection, get_cookie_token(self.headers))
            self.write_json(
                {"ok": True},
                cookie_headers=[self.expired_session_cookie_header()],
            )
        finally:
            connection.close()

    def handle_create_checkout_session(self):
        if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID:
            self.write_json(
                {"error": "Stripe nie je nakonfigurovaný. Nastav STRIPE_SECRET_KEY a STRIPE_PRICE_ID."},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
            return

        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Najprv sa prihláste alebo zaregistrujte."}, status=HTTPStatus.UNAUTHORIZED)
                return

            membership = get_membership(connection, user["id"])
            if is_membership_active(membership):
                self.write_json({"error": "Členstvo je už aktívne."}, status=HTTPStatus.BAD_REQUEST)
                return

            base_url = get_request_base_url(self)
            customer_id = get_or_create_customer(connection, user)
            session = stripe.checkout.Session.create(
                mode="subscription",
                customer=customer_id,
                line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
                success_url=f"{base_url}/app.html?checkout=success",
                cancel_url=f"{base_url}/app.html?checkout=cancel",
                allow_promotion_codes=True,
                metadata={"user_id": str(user["id"])},
                client_reference_id=str(user["id"]),
            )
            connection.execute(
                """
                INSERT OR REPLACE INTO checkout_sessions (user_id, stripe_session_id, created_at)
                VALUES (?, ?, ?)
                """,
                (user["id"], session["id"], format_timestamp(utc_now())),
            )
            connection.commit()
            log_activity(connection, "checkout_created", "Používateľ otvoril Stripe checkout pre členstvo.", user["id"])
            self.write_json({"url": session["url"]})
        except stripe.error.StripeError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)
        finally:
            connection.close()

    def handle_admin_membership_update(self):
        connection = get_db()
        try:
            admin_user = get_session_user(connection, self.headers)
            if not admin_user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            admin_user = ensure_admin_role(connection, admin_user)
            if admin_user["role"] != "admin":
                self.write_json({"error": "Nemáte prístup do administrácie."}, status=HTTPStatus.FORBIDDEN)
                return
            if not can_manage_admin_tools(admin_user):
                self.write_json({"error": "Len hlavný správca môže meniť členstvá používateľov."}, status=HTTPStatus.FORBIDDEN)
                return

            payload = require_json(self)
            user_id = int(payload.get("user_id") or 0)
            action = str(payload.get("action") or "").strip()
            days = parse_positive_int(payload.get("days"), 30)
            if not user_id or action not in {"activate_30d", "activate_days", "deactivate"}:
                self.write_json({"error": "Neplatná admin akcia."}, status=HTTPStatus.BAD_REQUEST)
                return

            target_user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not target_user:
                self.write_json({"error": "Používateľ neexistuje."}, status=HTTPStatus.NOT_FOUND)
                return

            now = utc_now()
            now_value = format_timestamp(now)
            if action in {"activate_30d", "activate_days"}:
                extend_days = 30 if action == "activate_30d" else max(1, min(days, 365))
                end_value = format_timestamp(now + timedelta(days=extend_days))
                connection.execute(
                    """
                    INSERT INTO memberships (user_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at, updated_at)
                    VALUES (?, 'active', ?, ?, ?, ?, ?)
                    ON CONFLICT(user_id) DO UPDATE SET
                        status = 'active',
                        current_period_end = excluded.current_period_end,
                        updated_at = excluded.updated_at
                    """,
                    (user_id, target_user["stripe_customer_id"], "", end_value, now_value, now_value),
                )
                log_activity(connection, "admin_membership_update", f"Admin aktivoval členstvo na {extend_days} dní.", admin_user["id"], target_user_id=user_id, days=extend_days)
            else:
                connection.execute(
                    """
                    INSERT INTO memberships (user_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at, updated_at)
                    VALUES (?, 'inactive', ?, ?, ?, ?, ?)
                    ON CONFLICT(user_id) DO UPDATE SET
                        status = 'inactive',
                        current_period_end = '',
                        updated_at = excluded.updated_at
                    """,
                    (user_id, target_user["stripe_customer_id"], "", "", now_value, now_value),
                )
                log_activity(connection, "admin_membership_update", "Admin deaktivoval členstvo.", admin_user["id"], target_user_id=user_id)
            connection.commit()
            self.write_json({"ok": True})
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        finally:
            connection.close()

    def handle_admin_role_update(self):
        connection = get_db()
        try:
            admin_user = get_session_user(connection, self.headers)
            if not admin_user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            admin_user = ensure_admin_role(connection, admin_user)
            if admin_user["role"] != "admin":
                self.write_json({"error": "Nemáte prístup do administrácie."}, status=HTTPStatus.FORBIDDEN)
                return
            if not can_manage_admin_tools(admin_user):
                self.write_json({"error": "Len hlavný správca môže meniť roly používateľov."}, status=HTTPStatus.FORBIDDEN)
                return

            payload = require_json(self)
            user_id = parse_positive_int(payload.get("user_id"), 0)
            role = str(payload.get("role") or "").strip().lower()
            if not user_id or role not in {"admin", "user"}:
                self.write_json({"error": "Neplatná rola alebo používateľ."}, status=HTTPStatus.BAD_REQUEST)
                return

            target_user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not target_user:
                self.write_json({"error": "Používateľ neexistuje."}, status=HTTPStatus.NOT_FOUND)
                return
            if target_user["id"] == admin_user["id"] and role != "admin":
                self.write_json({"error": "Nemôžete odobrať admin práva sami sebe."}, status=HTTPStatus.BAD_REQUEST)
                return
            if role == "user" and is_admin_email(target_user["email"]):
                self.write_json({"error": "E-mail správcu je rezervovaný pre administrátorský účet."}, status=HTTPStatus.BAD_REQUEST)
                return

            connection.execute(
                "UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
                (role, format_timestamp(utc_now()), user_id),
            )
            connection.commit()
            log_activity(connection, "admin_role_update", f"Admin zmenil rolu používateľa na {role}.", admin_user["id"], target_user_id=user_id, role=role)
            self.write_json({"ok": True})
        finally:
            connection.close()

    def handle_admin_assistant_review(self):
        connection = get_db()
        try:
            admin_user = get_session_user(connection, self.headers)
            if not admin_user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            admin_user = ensure_admin_role(connection, admin_user)
            if admin_user["role"] != "admin":
                self.write_json({"error": "Nemáte prístup do administrácie."}, status=HTTPStatus.FORBIDDEN)
                return

            payload = require_json(self)
            user_id = parse_positive_int(payload.get("user_id"), 0)
            message_id = parse_positive_int(payload.get("message_id"), 0)
            review_status = str(payload.get("review_status") or "").strip().lower()
            if not user_id or not message_id or review_status not in {"approved", "needs_review"}:
                self.write_json({"error": "Neplatná AI review akcia."}, status=HTTPStatus.BAD_REQUEST)
                return

            message_row = connection.execute(
                """
                SELECT *
                FROM assistant_messages
                WHERE id = ? AND user_id = ? AND role = 'assistant'
                """,
                (message_id, user_id),
            ).fetchone()
            if not message_row:
                self.write_json({"error": "AI odpoveď sa nenašla."}, status=HTTPStatus.NOT_FOUND)
                return

            connection.execute(
                """
                UPDATE assistant_messages
                SET review_status = ?, reviewed_by = ?, reviewed_at = ?
                WHERE id = ?
                """,
                (review_status, admin_user["id"], format_timestamp(utc_now()), message_id),
            )
            connection.commit()
            log_activity(
                connection,
                "assistant_review_updated",
                "Admin zmenil stav AI odpovede.",
                admin_user["id"],
                target_user_id=user_id,
                message_id=message_id,
                review_status=review_status,
            )
            self.write_json({"ok": True})
        finally:
            connection.close()

    def handle_admin_assistant_memory_reset(self):
        connection = get_db()
        try:
            admin_user = get_session_user(connection, self.headers)
            if not admin_user:
                self.write_json({"error": "Najprv sa prihláste."}, status=HTTPStatus.UNAUTHORIZED)
                return
            admin_user = ensure_admin_role(connection, admin_user)
            if admin_user["role"] != "admin":
                self.write_json({"error": "Nemáte prístup do administrácie."}, status=HTTPStatus.FORBIDDEN)
                return

            payload = require_json(self)
            user_id = parse_positive_int(payload.get("user_id"), 0)
            if not user_id:
                self.write_json({"error": "Chýba používateľ."}, status=HTTPStatus.BAD_REQUEST)
                return

            target_user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not target_user:
                self.write_json({"error": "Používateľ neexistuje."}, status=HTTPStatus.NOT_FOUND)
                return

            connection.execute("DELETE FROM assistant_messages WHERE user_id = ?", (user_id,))
            connection.execute("DELETE FROM assistant_threads WHERE user_id = ?", (user_id,))
            connection.execute(
                """
                INSERT INTO assistant_profiles (user_id, focus, notes, updated_at)
                VALUES (?, '', '', ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    focus = '',
                    notes = '',
                    updated_at = excluded.updated_at
                """,
                (user_id, format_timestamp(utc_now())),
            )
            connection.commit()
            log_activity(
                connection,
                "assistant_memory_reset",
                "Admin vymazal AI históriu a pamäť používateľa.",
                admin_user["id"],
                target_user_id=user_id,
            )
            self.write_json({"ok": True})
        finally:
            connection.close()

    def handle_stripe_webhook(self):
        if not STRIPE_WEBHOOK_SECRET:
            self.write_json({"error": "Webhook secret nie je nastavený."}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        payload = self.read_request_body()
        signature = self.headers.get("Stripe-Signature", "")

        try:
            event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
        except ValueError:
            self.write_json({"error": "Neplatný webhook payload."}, status=HTTPStatus.BAD_REQUEST)
            return
        except stripe.error.SignatureVerificationError:
            self.write_json({"error": "Neplatný Stripe podpis."}, status=HTTPStatus.BAD_REQUEST)
            return

        connection = get_db()
        try:
            event_type = event["type"]
            data = event["data"]["object"]

            if event_type == "checkout.session.completed":
                user_id = int(data.get("metadata", {}).get("user_id") or data.get("client_reference_id") or 0)
                subscription_id = data.get("subscription")
                if subscription_id:
                    subscription = stripe.Subscription.retrieve(subscription_id)
                    sync_membership_from_subscription(connection, subscription, fallback_user_id=user_id or None)

            if event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
                sync_membership_from_subscription(connection, data)

            self.write_json({"received": True})
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        finally:
            connection.close()

    def require_active_membership(self, membership_error_message="Na nahranie vlastných súborov je potrebné aktívne členstvo."):
        connection = get_db()
        try:
            user = get_session_user(connection, self.headers)
            if not user:
                self.write_json({"error": "Pre túto akciu sa musíte prihlásiť."}, status=HTTPStatus.UNAUTHORIZED)
                return None

            membership = get_membership(connection, user["id"])
            if not is_membership_active(membership):
                self.write_json({"error": membership_error_message}, status=HTTPStatus.PAYMENT_REQUIRED)
                return None
            return user
        finally:
            connection.close()

    def handle_parse(self):
        try:
            form = parse_multipart_form(self.headers, self.read_request_body())
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        file_items = form.get("file", [])
        if not file_items:
            self.write_json({"error": "Súbor nebol prijatý."}, status=HTTPStatus.BAD_REQUEST)
            return

        file_item = file_items[0]
        file_name = file_item.get("filename") or "upload"
        extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        file_bytes = file_item.get("content", b"")
        if reject_large_upload(self, len(file_bytes), MAX_CONTACT_FILE_BYTES, "Súbor"):
            return

        try:
            if extension == "csv":
                table = table_from_csv(file_bytes)
            elif extension == "xlsx":
                table = table_from_xlsx(file_bytes)
            elif extension == "xls":
                table = table_from_xls(file_bytes)
            else:
                raise ValueError("Podporované sú len CSV, XLSX a XLS.")
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        self.write_json(table)

    def handle_process(self):
        user = self.require_active_membership()
        if not user:
            return

        try:
            form = parse_multipart_form(self.headers, self.read_request_body())
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if "files" not in form:
            self.write_json({"error": "Neboli prijaté žiadne súbory."}, status=HTTPStatus.BAD_REQUEST)
            return

        uploads = []
        for file_item in form["files"]:
            file_name = file_item.get("filename") or "upload"
            file_bytes = file_item.get("content", b"")
            if file_bytes:
                if reject_large_upload(self, len(file_bytes), MAX_CONTACT_FILE_BYTES, f"Súbor {file_name}"):
                    return
                uploads.append((file_name, file_bytes))

        if not uploads:
            self.write_json({"error": "Neboli prijaté žiadne súbory."}, status=HTTPStatus.BAD_REQUEST)
            return

        try:
            payload = process_uploads(uploads)
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        connection = get_db()
        try:
            log_activity(connection, "upload_processed", "Používateľ spracoval databázu kontaktov.", user["id"], files=len(uploads))
        finally:
            connection.close()
        self.write_json(payload)

    def handle_compress_file(self):
        user = self.require_active_membership("Na použitie kompresie súborov je potrebné aktívne členstvo.")
        if not user:
            return

        try:
            form = parse_multipart_form(self.headers, self.read_request_body())

            file_items = form.get("file", [])
            if not file_items:
                self.write_json({"error": "Súbor nebol prijatý."}, status=HTTPStatus.BAD_REQUEST)
                return

            target_items = form.get("target_mb", [])
            target_mb = ""
            if target_items:
                target_mb = (target_items[0].get("content", b"") or b"").decode("utf-8", "ignore").strip()

            file_item = file_items[0]
            file_name = file_item.get("filename") or "upload"
            file_bytes = file_item.get("content", b"")
            if reject_large_upload(self, len(file_bytes), MAX_COMPRESS_FILE_BYTES, "Súbor"):
                return

            result = compress_upload(file_name, file_bytes, target_mb)

            connection = get_db()
            try:
                log_activity(
                    connection,
                    "file_compressed",
                    "Používateľ zmenšil súbor.",
                    user["id"],
                    file=file_name,
                    original_bytes=result.original_bytes,
                    compressed_bytes=result.compressed_bytes,
                    target_bytes=result.target_bytes,
                    status=result.status,
                )
            finally:
                connection.close()

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", result.content_type)
            self.send_header("Content-Disposition", f'attachment; filename="{result.file_name}"')
            self.send_header("Content-Length", str(len(result.data)))
            self.send_header("X-Compression-Original-Bytes", str(result.original_bytes))
            self.send_header("X-Compression-Compressed-Bytes", str(result.compressed_bytes))
            self.send_header("X-Compression-Target-Bytes", str(result.target_bytes))
            self.send_header("X-Compression-Status", result.status)
            self.send_header("X-Compression-Reached-Target", "1" if result.reached_target else "0")
            self.end_headers()
            self.wfile.write(result.data)
        except ValueError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        except RuntimeError as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        except Exception as exc:
            self.write_json({"error": f"Kompresia zlyhala: {exc}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)

    def handle_export_xlsx(self):
        user = self.require_active_membership()
        if not user:
            return

        try:
            payload = require_json(self)
        except ValueError:
            self.write_json({"error": "Neplatné dáta pre export."}, status=HTTPStatus.BAD_REQUEST)
            return

        rows = payload.get("rows", [])
        filename = payload.get("filename", "merged_contacts.xlsx")
        if not rows:
            self.write_json({"error": "Nie sú dáta na export."}, status=HTTPStatus.BAD_REQUEST)
            return

        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = "Kontakty"

        sheet.append(OUTPUT_HEADERS)
        for row in rows:
            sheet.append([row.get(header, "") for header in OUTPUT_HEADERS])

        header_fill = PatternFill(fill_type="solid", fgColor="1F4E78")
        header_font = Font(color="FFFFFF", bold=True)
        for cell in sheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        sheet.auto_filter.ref = sheet.dimensions
        sheet.freeze_panes = "A2"

        for column_cells in sheet.columns:
            max_length = max(len(str(cell.value or "")) for cell in column_cells)
            letter = get_column_letter(column_cells[0].column)
            sheet.column_dimensions[letter].width = min(max(max_length + 2, 12), 40)

        buffer = io.BytesIO()
        workbook.save(buffer)
        body = buffer.getvalue()

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        connection = get_db()
        try:
            log_activity(connection, "xlsx_export", "Používateľ exportoval XLSX.", user["id"], filename=filename)
        finally:
            connection.close()


def main():
    init_db()
    server = HTTPServer((HOST, PORT), AppHandler)
    print(f"Serving Unifyo on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
