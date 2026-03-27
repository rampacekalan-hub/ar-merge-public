# Kontakt Merge

Lokálna web appka na porovnávanie a zlúčenie viacerých databáz kontaktov.

## Nasadenie na web cez Render

Verejnú verziu projektu vieš nasadiť online cez [Render](https://render.com/).

V projekte už je pripravené:

- [requirements.txt](/Users/alanrampacek/Documents/Playground-public/requirements.txt)
- [render.yaml](/Users/alanrampacek/Documents/Playground-public/render.yaml)
- [server.py](/Users/alanrampacek/Documents/Playground-public/server.py) s podporou pre `PORT`

Postup:

1. Nahraj priečinok `Playground-public` do samostatného GitHub repozitára.
2. Prihlás sa do Render.
3. Zvoľ `New +` -> `Blueprint`.
4. Pripoj GitHub repozitár.
5. Render načíta [render.yaml](/Users/alanrampacek/Documents/Playground-public/render.yaml) a pripraví web service.
6. Potvrď deploy.
7. Po dokončení dostaneš verejnú URL.

Ak by si nechcel použiť Blueprint, nastav ručne:

- Build Command: `pip install -r requirements.txt`
- Start Command: `python3 server.py`

Po deployi bude appka dostupná online cez Render URL a neskôr si na ňu môžeš nasmerovať vlastnú doménu.

## Produkčný CLI import kontaktov

Súbor [contact_importer.py](/Users/alanrampacek/Documents/Playground/contact_importer.py) je samostatný skript na spoľahlivý import, čistenie a deduplikáciu kontaktov z viacerých `CSV`, `XLSX` a `XLS` súborov.

Čo robí:

- rozpozná rôzne názvy vstupných stĺpcov
- ponechá iba stĺpce `meno`, `priezvisko`, `email`, `telefón`
- vyradí kontakty bez e-mailu aj telefónu
- normalizuje mená, e-maily a telefónne čísla
- deduplikuje primárne podľa e-mailu a telefónu
- pri viacerých verziách toho istého kontaktu ponechá najkvalitnejší záznam
- exportuje výsledok do `CSV` alebo profesionálne formátovaného `XLSX`
- vygeneruje report s počtami importov, duplicitných a vyradených kontaktov

Spustenie:

```bash
cd /Users/alanrampacek/Documents/Playground
python3 contact_importer.py examples/contacts_a.csv examples/contacts_b.csv -o output/final_contacts.xlsx
```

Voliteľne môžeš zmeniť cestu k reportu:

```bash
python3 contact_importer.py examples/contacts_a.csv examples/contacts_b.csv \
  -o output/final_contacts.xlsx \
  --report output/final_contacts_report.json
```

Poznámka k deduplikácii:

- presná zhoda `email`
- presná zhoda normalizovaného `telefónu`
- veľmi opatrný fallback cez `meno + priezvisko` len bez konfliktných kontaktných údajov
- riešenie zámerne neprepája dva rôzne kontakty iba preto, že majú rovnaké meno

## Čo vie

- načítať viac CSV súborov naraz
- načítať `CSV`, `XLSX` aj `XLS` cez lokálny Python backend
- automaticky rozpoznať stĺpce pre meno, priezvisko, email a telefón
- použiť fallback aj pre stĺpec s celým menom
- nájsť duplicitné kontakty medzi viacerými databázami
- pripraviť zlúčený zoznam bez duplicít, kde každý kontakt zostane len 1x
- exportovať zlúčené dáta do `CSV` aj `XLSX`
- exportovať duplicitné skupiny do `CSV`
- vo finálnom exporte držať stĺpce `meno`, `priezvisko`, `email`, `telefon`

## Podporované stĺpce

Appka očakáva tieto logické polia:

- `meno` / `first_name`
- `priezvisko` / `last_name`
- `email`
- `telefon` / `telefón` / `phone`
- `full_name` / `celé meno` ako fallback

## Ako spustiť na MacBooku

Najjednoduchšie:

```bash
cd /Users/alanrampacek/Documents/Playground
./start.sh
```

Potom otvor:

`http://localhost:8080`

Appka teraz beží ako lokálna web appka cez `server.py`, takže `XLSX/XLS` spracovanie ide priamo na tvojom Macu.

Ak by script nešiel spustiť, použi priamo:

```bash
cd /Users/alanrampacek/Documents/Playground
python3 -m http.server 8080
```

## Ako z toho spraviť appku na iPhone

1. Na MacBooku spusti lokálny server.
2. Ak chceš otvoriť appku aj na iPhone, potrebujeme ju dať na verejnú URL alebo spustiť server dostupný v tvojej Wi‑Fi sieti.
3. V Safari na iPhone otvor adresu appky.
4. Stlač `Share`.
5. Zvoľ `Add to Home Screen`.
6. Na ploche sa vytvorí app-like ikona `Kontakt Merge`.

Poznámka: iPhone nevie otvoriť `localhost` z MacBooku priamo. Na iPhone teda appka pôjde buď po nasadení na web, alebo cez sieťovo dostupný server.

## Testovacie dáta

Ukážkové CSV súbory nájdeš v priečinku `examples/`:

- `examples/contacts_a.csv`
- `examples/contacts_b.csv`

## Ako funguje deduplikácia

1. Email sa porovnáva case-insensitive.
2. Ak majú dva kontakty rozdielny email, nepovažujú sa za duplicitu.
3. Telefón sa normalizuje odstránením medzier, pomlčiek a zátvoriek.
4. Ak chýba email aj telefón, porovná sa kombinácia mena a priezviska.
5. Pri merge sa vyberie najplnšia hodnota z dostupných zdrojov.
6. Duplicitný kontakt sa vypíše v prehľade duplicít, ale vo finálnej databáze zostane iba 1x.
7. Ak email alebo telefón chýba, pole ostane prázdne.
