# Nasadenie na web

Najjednoduchšia cesta je **Cloudflare Pages** bez Git-u.

Oficiálne zdroje:

- [Cloudflare Pages overview](https://developers.cloudflare.com/pages/)
- [Cloudflare Pages direct upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [GitHub Pages docs](https://docs.github.com/en/pages)
- [GitHub Pages custom workflows](https://docs.github.com/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Možnosť A: Cloudflare Pages bez Git-u

### 1. Priprav ZIP balík

V Termináli:

```bash
cd /Users/alanrampacek/Documents/Playground
chmod +x package-web.sh
./package-web.sh
```

Vznikne súbor:

`/Users/alanrampacek/Documents/Playground/kontakt-merge-web.zip`

### 2. Vytvor účet

Choď na:

<https://dash.cloudflare.com/sign-up>

### 3. Vytvor web projekt

Po prihlásení:

1. otvor `Workers & Pages`
2. klikni `Create application`
3. vyber `Pages`
4. vyber `Upload assets`

Podľa Cloudflare dokumentácie vieš pri direct upload nahrať ZIP alebo priečinok cez dashboard.

### 4. Nahraj ZIP

Nahraj súbor:

`kontakt-merge-web.zip`

### 5. Dokonči deploy

1. zadaj názov projektu, napríklad `kontakt-merge`
2. klikni `Deploy site`

Po deploy dostaneš URL v tvare:

`https://kontakt-merge.pages.dev`

### 6. Otvor na iPhone

Na iPhone otvor pridelenú URL v Safari a daj:

1. `Share`
2. `Add to Home Screen`

Tým z toho spravíš app-like ikonu na ploche.

## Možnosť B: GitHub Pages

Táto možnosť je dobrá, ak chceš mať projekt v GitHub repozitári.

### 1. Vytvor nový repozitár na GitHube

Na:

<https://github.com/new>

Vytvor napríklad repozitár:

`kontakt-merge`

### 2. Nahraj súbory projektu

Nahraj obsah priečinka:

`/Users/alanrampacek/Documents/Playground`

### 3. Zapni Pages

V repozitári:

1. otvor `Settings`
2. otvor `Pages`
3. v `Build and deployment` vyber `Deploy from a branch`
4. vyber branch `main`
5. vyber root `/`
6. ulož

### 4. Počkaj na vygenerovanie URL

GitHub zvyčajne vytvorí adresu v tvare:

`https://<tvoje-meno>.github.io/kontakt-merge/`

Súbor `.nojekyll` je už pripravený, aby GitHub nasadil statický web priamo.

### 5. Otvor na iPhone

Otvor tú URL v Safari a zvoľ:

1. `Share`
2. `Add to Home Screen`

## Odporúčanie

Ak chceš čo najmenej krokov, zvoľ **Cloudflare Pages**.
Ak chceš mať kód aj verzionovaný online, zvoľ **GitHub Pages**.
