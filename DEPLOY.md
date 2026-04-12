# Nasadenie Unifyo

## Produkcia (Python backend)

Plná aplikácia (**Stripe**, **OpenAI**, **SQLite**, API) vyžaduje **`server.py`** za reverznou proxy (napr. Caddy) a **systemd** službu.

Príklad (Ubuntu, Hetzner):

1. Aplikácia v `/opt/unifyo/app` (`.venv`, `pip install -r requirements.txt`).
2. Tajomstvá v `/etc/unifyo/unifyo.env` — podľa `unifyo.env.example`.
3. **systemd:** `WorkingDirectory`, `EnvironmentFile`, `ExecStart=.venv/bin/python server.py`, `Restart=always`.
4. **Caddy:** `reverse_proxy 127.0.0.1:8080` pre `unifyo.online`.

Po zmene kódu: `git pull`, `pip install -r requirements.txt` podľa potreby, `systemctl restart unifyo`.

**Stripe:** nastav `STRIPE_PRICE_ID` (platný `price_...`) alebo `DEFAULT_STRIPE_PRICE_ID` ako zálohu. V repozitári už nie je natvrdo žiadne `price_...` v kóde.

---

## Netlify / statický hosting

Súbor **`netlify.toml`** je vhodný len na **statické súbory**. Checkout a API bez backendu na tej istej doméne nebudú fungovať.

---

## Odkazy

- [Caddy](https://caddyserver.com/docs/)
- [Stripe](https://stripe.com/docs)
