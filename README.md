# MapCident

MapCident to system do zglaszania problemow w przestrzeni miejskiej. Aplikacja
pozwala uzytkownikom dodawac zgloszenia z opisem, kategoria, lokalizacja i
zdjeciami, a nastepnie przegladac je na liscie oraz na mapie.

Demo: https://mapcident.qwizi.ovh/

## Cel Projektu

Projekt zostal przygotowany w ramach przedmiotu dotyczacego architektury,
komunikacji miedzy systemami oraz baz danych. System sklada sie z trzech
glownych elementow:

- backendu z REST API,
- bazy danych PostgreSQL,
- aplikacji webowej korzystajacej z API.

## Technologie

- Backend: Django, Django Ninja, Django Ninja JWT
- Frontend: Next.js, React, TypeScript
- Baza danych: PostgreSQL
- Mapa: MapLibre GL
- Konteneryzacja i wdrozenie: Docker, Docker Compose, Caddy
- CI/CD: GitHub Actions, GitHub Container Registry

## Architektura

```mermaid
flowchart LR
    U["Uzytkownik"] --> B["Przegladarka"]
    B --> F["Frontend Next.js"]
    F --> A["Backend Django REST API"]
    A --> DB[(PostgreSQL)]
    A --> M["Pliki mediow / zdjecia"]
    C["Caddy reverse proxy"] --> F
    C --> A
```

Frontend komunikuje sie z backendem przez REST API. Backend odpowiada za
uwierzytelnianie, walidacje danych, logike aplikacji oraz zapis i odczyt danych
z PostgreSQL. Zdjecia zgloszen sa zapisywane jako pliki mediow i powiazane z
rekordami w bazie danych.

## Model Danych

```mermaid
erDiagram
    USERS ||--o{ REPORTS : creates
    USERS ||--o{ COMMENTS : writes
    CATEGORY_GROUPS ||--o{ CATEGORIES : contains
    CATEGORIES ||--o{ REPORTS : classifies
    REPORTS ||--o{ COMMENTS : has
    REPORTS ||--o{ REPORT_IMAGES : has

    USERS {
        uuid id PK
        string email UK
        string username
        string role
    }

    CATEGORY_GROUPS {
        uuid id PK
        string name
        string slug UK
        string icon
        string color
        int order
    }

    CATEGORIES {
        uuid id PK
        uuid group_id FK
        string name
        string slug UK
        string icon
        string color
        int order
    }

    REPORTS {
        uuid id PK
        string title
        text description
        uuid category_id FK
        uuid author_id FK
        string status
        float latitude
        float longitude
        string h3_index
        datetime created_at
        datetime updated_at
    }

    REPORT_IMAGES {
        uuid id PK
        uuid report_id FK
        string image
        int order
    }

    COMMENTS {
        uuid id PK
        uuid report_id FK
        uuid author_id FK
        text content
        datetime created_at
        datetime updated_at
    }
```

Glowna encja systemu to zgloszenie. Zgloszenie jest przypisane do autora,
kategorii, lokalizacji oraz statusu. Dodatkowo moze miec wiele zdjec i
komentarzy. Kategorie sa pogrupowane, co ulatwia filtrowanie i prezentacje
danych w interfejsie.

## Komunikacja

```mermaid
sequenceDiagram
    participant U as Uzytkownik
    participant F as Frontend
    participant A as REST API
    participant D as PostgreSQL

    U->>F: Wypelnia formularz zgloszenia
    F->>A: POST /api/v1/reports/
    A->>D: Zapis zgloszenia
    D-->>A: Utworzony rekord
    A-->>F: Dane nowego zgloszenia
    F-->>U: Aktualizacja mapy i listy
```

## Funkcjonalnosci

- rejestracja i logowanie uzytkownikow,
- uwierzytelnianie JWT,
- dodawanie, edycja i usuwanie zgloszen,
- dodawanie zdjec do zgloszen,
- lista zgloszen z wyszukiwaniem, filtrowaniem i sortowaniem,
- filtrowanie po kategorii oraz statusie,
- komentarze do zgloszen,
- statusy zgloszen: oczekujace, w trakcie, rozwiazane, odrzucone,
- mapa z pinami i klastrowaniem zgloszen,
- podglad szczegolow zgloszenia po kliknieciu na mapie,
- profil uzytkownika z lista jego zgloszen,
- panel administracyjny Django.

## REST API

Glowne zasoby API:

- `/api/v1/auth/register` - rejestracja uzytkownika,
- `/api/v1/token/pair` - logowanie i pobranie tokenow JWT,
- `/api/v1/auth/me` - dane aktualnego uzytkownika,
- `/api/v1/categories/` - lista kategorii,
- `/api/v1/categories/grouped/` - kategorie pogrupowane,
- `/api/v1/reports/` - lista i tworzenie zgloszen,
- `/api/v1/reports/{id}` - szczegoly, edycja i usuwanie zgloszenia,
- `/api/v1/reports/{id}/images` - dodawanie zdjec,
- `/api/v1/reports/{id}/comments/` - komentarze do zgloszenia,
- `/api/v1/reports/map` - dane zgloszen do wyswietlenia na mapie.

API wykorzystuje standardowe metody HTTP: `GET`, `POST`, `PATCH`, `PUT` i
`DELETE`.

## Uruchomienie Lokalne

1. Skopiuj plik konfiguracyjny:

```bash
copy .env.example .env
```

2. Uruchom kontenery:

```bash
docker compose up --build
```

3. Wykonaj migracje bazy danych:

```bash
docker compose exec backend uv run python manage.py migrate
```

4. Zaladuj startowe kategorie:

```bash
docker compose exec backend uv run python manage.py loaddata apps/categories/fixtures/categories.json
```

Po uruchomieniu:

- frontend: http://localhost:3009
- backend API: http://localhost:8000/api/v1/
- panel admina: http://localhost:8000/admin/

## Wdrozenie

Aplikacja jest dostepna pod adresem:

https://mapcident.qwizi.ovh/

Projekt ma przygotowana konfiguracje produkcyjna w `compose.prod.yml`.
Wdrozenie wykorzystuje kontenery Docker oraz Caddy jako reverse proxy, ktore
kieruje ruch do frontendu Next.js i backendu Django. Baza PostgreSQL dziala jako
osobny kontener.

## Struktura Projektu

```text
apps/          aplikacje Django: users, categories, reports, comments
config/        konfiguracja Django i rejestracja API
frontend/      aplikacja Next.js
caddy/         konfiguracja reverse proxy
compose.yml    lokalne srodowisko developerskie
compose.prod.yml konfiguracja produkcyjna
```
