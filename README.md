# Unifyo

Webová aplikácia **Unifyo**: pracovný priestor, AI, CRM, import a zlúčenie kontaktov, kompresia súborov. Backend je **`server.py`** (HTTP API, SQLite, Stripe, OpenAI a ďalšie služby).

## Lokálny beh

```bash
cd /path/to/Playground
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 server.py
```

Otvor `http://localhost:8080` (alebo `PORT` z prostredia). Čistý `python -m http.server` nestačí — chýba API.

Premenné prostredia: pozri **`unifyo.env.example`**.

## Nasadenie

**[DEPLOY.md](DEPLOY.md)** — produkcia (Caddy + systemd + Python), rozdiel voči čistému Netlify/statickému hostingu.

## Moduly

- **`contact_importer.py`** — CLI import a čistenie CSV/XLSX/XLS.
- **`file_compressor.py`** — kompresia obrázkov a PDF (PDF na macOS môže používať `pdf_compressor.swift`).

Stará URL **`compressor.html`** presmeruje na **`compress.html`**.
