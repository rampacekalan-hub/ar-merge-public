#!/usr/bin/env python3
import csv
import hashlib
import hmac
import io
import json
import os
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
SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "").strip()
ADMIN_EMAILS = {item.strip().lower() for item in os.environ.get("ADMIN_EMAILS", "").split(",") if item.strip()}
MAX_REQUEST_BODY_MB = float(os.environ.get("MAX_REQUEST_BODY_MB", "110"))
MAX_CONTACT_FILE_MB = float(os.environ.get("MAX_CONTACT_FILE_MB", "8"))
MAX_COMPRESS_FILE_MB = float(os.environ.get("MAX_COMPRESS_FILE_MB", "100"))

MAX_REQUEST_BODY_BYTES = max(1, int(MAX_REQUEST_BODY_MB * 1024 * 1024))
MAX_CONTACT_FILE_BYTES = max(1, int(MAX_CONTACT_FILE_MB * 1024 * 1024))
MAX_COMPRESS_FILE_BYTES = max(1, int(MAX_COMPRESS_FILE_MB * 1024 * 1024))

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
            """
        )
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)").fetchall()}
        if "name" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
        if "role" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
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
        if self.path.startswith("/api/me"):
            self.handle_me()
            return
        if self.path.startswith("/api/account"):
            self.handle_account()
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
        if self.path == "/api/assistant/tasks":
            self.handle_assistant_tasks()
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

            tasks = get_assistant_tasks(connection, user["id"], include_done=True)
            brief = build_assistant_brief(tasks)
            self.write_json({"tasks": tasks, "brief": brief})
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
